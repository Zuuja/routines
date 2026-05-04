import { store } from '../store.js';
import { navigateTo } from '../app.js';
import { formatTime, playBeep, requestWakeLock, releaseWakeLock } from '../utils.js';

const PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const NEXT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`;
const SKIP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>`;
const DELAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2v6h2.5l-3.5 3.5-3.5-3.5h2.5V9zm-5 9H4v2h16v-2h-2v-2h2v-2h2v6H2v-6h2v6z"/></svg>`;
const STOP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`;

export const RunView = {
    render: (params) => {
        const routine = store.getRoutine(params.id);
        if (!routine) return `<p>Routine not found</p>`;

        // Map original tasks to include their original index (1-based for display)
        const tasksWithOrder = routine.tasks.map((t, i) => ({ 
            ...t, 
            originalIndex: i + 1 
        }));

        window.runState = {
            routineId: params.id,
            tasks: [...tasksWithOrder],
            index: 0,
            timeLeft: tasksWithOrder[0].seconds,
            currentTaskStartTime: Date.now(),
            results: [],
            status: 'running', 
            intervalId: null
        };

        return `
            <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
                <button class="btn btn-secondary" onclick="window.app.stopRun()">
                    ${STOP_ICON} <span style="margin-left:0.5rem">Stop</span>
                </button>
                <div style="text-align: right;">
                    <small style="color: var(--text-secondary);">Task</small><br>
                    <span id="task-counter">1 / ${routine.tasks.length}</span>
                </div>
            </div>

            <div class="text-center flex-col justify-center" style="min-height: 35vh;">
                <h2 id="task-name" style="font-size: 2rem; margin-bottom: 0;">${routine.tasks[0].name}</h2>
                <div id="timer" class="timer-display">${formatTime(routine.tasks[0].seconds)}</div>
            </div>

            <div class="flex gap-2" style="margin-bottom: 1rem;">
                <button id="btn-toggle" class="btn btn-secondary" style="flex: 1;" onclick="window.app.toggleTimer()">
                    ${PAUSE_ICON} Pause
                </button>
                <button id="btn-delay" class="btn btn-secondary" style="flex: 1;" onclick="window.app.delayTask()">
                   <svg style="width:1.25rem;height:1.25rem;margin-right:0.5rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg> Delay
                </button>
            </div>
            <div class="flex gap-2" style="margin-bottom: 2rem;">
                 <button class="btn btn-secondary" style="flex: 1;" onclick="window.app.skipTask()">
                    ${SKIP_ICON} Skip
                </button>
                <button class="btn btn-primary" style="flex: 2;" onclick="window.app.nextTask()">
                    Done ${NEXT_ICON}
                </button>
            </div>

            <div class="card">
                <h3>Up Next</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Tap a task to prioritize it (move to now)</p>
                <div id="queue" class="task-queue">
                    <!-- Queue -->
                </div>
            </div>
        `;
    },

    afterRender: () => {
        const timerEl = document.getElementById('timer');
        const nameEl = document.getElementById('task-name');
        const counterEl = document.getElementById('task-counter');
        const queueEl = document.getElementById('queue');
        const toggleBtn = document.getElementById('btn-toggle');
        const delayBtn = document.getElementById('btn-delay');

        requestWakeLock();

        const updateUI = () => {
            const state = window.runState;
            const currentTask = state.tasks[state.index];
            
            // Timer
            timerEl.textContent = formatTime(state.timeLeft);
            if (state.timeLeft < 0) timerEl.classList.add('timer-overtime');
            else timerEl.classList.remove('timer-overtime');

            // Info
            nameEl.textContent = currentTask.name;
            counterEl.textContent = `${state.index + 1} / ${state.tasks.length}`;

            // Buttons
            toggleBtn.innerHTML = state.status === 'running' 
                ? `${PAUSE_ICON} Pause` 
                : `${PLAY_ICON} Resume`;
            
            // Disable Delay if it's the last task
            if (state.index >= state.tasks.length - 1) {
                delayBtn.disabled = true;
                delayBtn.style.opacity = '0.5';
            } else {
                delayBtn.disabled = false;
                delayBtn.style.opacity = '1';
            }

            // Queue
            const nextTasks = state.tasks.slice(state.index + 1);
            if (nextTasks.length === 0) {
                queueEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">No more tasks! 🎉</p>`;
            } else {
                queueEl.innerHTML = nextTasks.map((t, i) => {
                    // i is index relative to the sliced array (0, 1, 2...)
                    // actualIdx is index in the main tasks array
                    const actualIdx = state.index + 1 + i; 
                    return `
                    <div class="queue-item flex justify-between" onclick="window.app.jumpToTask(${actualIdx})" style="cursor: pointer;">
                        <span>${t.name}</span>
                        <span>${formatTime(t.seconds)}</span>
                    </div>
                `}).join('');
            }
        };

        const tick = () => {
            const state = window.runState;
            if (state.status !== 'running') return;
            state.timeLeft--;
            if (state.timeLeft === 0) playBeep();
            updateUI();
        };

        window.runState.intervalId = setInterval(tick, 1000);

        // --- Logic to save stats ---
        const recordTaskStats = (status = 'completed') => {
            const state = window.runState;
            const currentTask = state.tasks[state.index];
            const now = Date.now();
            
            const actualSeconds = currentTask.seconds - state.timeLeft;
            
            state.results.push({
                name: currentTask.name,
                planned: currentTask.seconds,
                actual: actualSeconds,
                status: status, // 'completed' or 'skipped'
                originalIndex: currentTask.originalIndex // 1-based index from routine creation
            });
            
            state.currentTaskStartTime = now;
        };

        const finishRoutine = () => {
            const state = window.runState;
            clearInterval(state.intervalId);
            
            // Save Data
            const runData = {
                id: Date.now().toString(), // Run ID
                timestamp: Date.now(),
                tasks: state.results
            };
            store.saveRun(state.routineId, runData);

            navigateTo('summary', { id: state.routineId });
        };


        // --- Handlers ---

        window.app.toggleTimer = () => {
            window.runState.status = window.runState.status === 'running' ? 'paused' : 'running';
            updateUI();
        };

        window.app.delayTask = () => {
            const state = window.runState;
            if (state.index >= state.tasks.length - 1) return; 

            // When delaying, we don't count it as "Done". 
            // We just reset the timer for the next task.
            const current = state.tasks[state.index];
            state.tasks.splice(state.index, 1);
            state.tasks.push(current);
            
            state.timeLeft = state.tasks[state.index].seconds;
            state.status = 'running';
            state.currentTaskStartTime = Date.now();
            updateUI();
        };

        window.app.jumpToTask = (targetIdx) => {
            const state = window.runState;
            const targetTask = state.tasks[targetIdx];
            
            // Prioritizing doesn't finish the current task. It just pushes it down.
            state.tasks.splice(targetIdx, 1);
            state.tasks.splice(state.index, 0, targetTask);
            
            state.timeLeft = state.tasks[state.index].seconds;
            state.status = 'running';
            state.currentTaskStartTime = Date.now();
            updateUI();
        };

        window.app.nextTask = () => {
            recordTaskStats('completed');
            const state = window.runState;
            if (state.index >= state.tasks.length - 1) {
                finishRoutine();
                return;
            }
            state.index++;
            state.timeLeft = state.tasks[state.index].seconds;
            state.status = 'running';
            updateUI();
        };

        window.app.skipTask = () => {
            recordTaskStats('skipped'); // Explicitly mark as skipped
            const state = window.runState;
            if (state.index >= state.tasks.length - 1) {
                finishRoutine();
                return;
            }
            state.index++;
            state.timeLeft = state.tasks[state.index].seconds;
            state.status = 'running';
            updateUI();
        };

        window.app.stopRun = () => {
            if (confirm("Stop current routine?")) {
                navigateTo('home');
            }
        };

        updateUI();
    },

    cleanup: () => {
        if (window.runState && window.runState.intervalId) {
            clearInterval(window.runState.intervalId);
        }
        releaseWakeLock();
        delete window.runState;
        delete window.app.toggleTimer;
        delete window.app.nextTask;
        delete window.app.skipTask;
        delete window.app.delayTask;
        delete window.app.jumpToTask;
        delete window.app.stopRun;
    }
};
