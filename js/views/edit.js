import { store } from '../store.js';
import { navigateTo } from '../app.js';
import { generateId } from '../utils.js';

const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

export const EditView = {
    render: (params) => {
        const isEdit = params && params.id;
        let routine = { name: '', tasks: [{ name: '', seconds: 60 }] };
        
        if (isEdit) {
            routine = store.getRoutine(params.id);
            if (!routine) return `<p>Routine not found</p>`;
        }

        // We'll store the state in a global variable for this view to access during interactions
        window.editState = JSON.parse(JSON.stringify(routine)); // Deep copy

        return `
            <div class="flex items-center gap-2" style="margin-bottom: 1.5rem;">
                <button class="btn btn-secondary btn-icon" onclick="window.app.goHome()">←</button>
                <h1>${isEdit ? 'Edit Routine' : 'New Routine'}</h1>
            </div>

            <div class="card">
                <label>Routine Name</label>
                <input type="text" id="routine-name" value="${routine.name}" placeholder="e.g. Morning Routine">
            </div>

            <h3 style="margin-bottom: 1rem;">Tasks</h3>
            <div id="tasks-list" class="flex-col gap-2">
                <!-- Tasks injected here -->
            </div>

            <button class="btn btn-secondary w-full" style="margin-top: 1rem; margin-bottom: 2rem;" onclick="window.app.addTask()">
                + Add Task
            </button>

            <div class="flex gap-4">
                <button class="btn btn-primary flex-1" onclick="window.app.saveRoutine()">Save</button>
                <button class="btn btn-secondary flex-1" onclick="window.app.goHome()">Cancel</button>
            </div>
        `;
    },

    afterRender: (params) => {
        const listEl = document.getElementById('tasks-list');
        const nameEl = document.getElementById('routine-name');

        const renderTasks = () => {
            listEl.innerHTML = window.editState.tasks.map((task, index) => {
                const mins = Math.floor(task.seconds / 60);
                const secs = task.seconds % 60;
                return `
                    <div class="card" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div class="flex justify-between items-center">
                            <span style="font-weight: bold; color: var(--text-secondary);">#${index + 1}</span>
                            <button class="btn btn-danger btn-icon" style="padding: 0.25rem;" onclick="window.app.removeTask(${index})">
                                ${TRASH_ICON}
                            </button>
                        </div>
                        <input type="text" placeholder="Task Name" value="${task.name}" onchange="window.app.updateTaskName(${index}, this.value)">
                        <div class="flex gap-2 items-center">
                            <div class="flex-1">
                                <label>Min</label>
                                <input type="number" value="${mins}" min="0" onchange="window.app.updateTaskTime(${index}, 'min', this.value)">
                            </div>
                            <div class="flex-1">
                                <label>Sec</label>
                                <input type="number" value="${secs}" min="0" max="59" onchange="window.app.updateTaskTime(${index}, 'sec', this.value)">
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Handlers
        window.app.goHome = () => navigateTo('home');
        
        window.app.addTask = () => {
            window.editState.tasks.push({ name: '', seconds: 60 });
            renderTasks();
        };

        window.app.removeTask = (index) => {
            if (window.editState.tasks.length <= 1) return alert('Need at least one task');
            window.editState.tasks.splice(index, 1);
            renderTasks();
        };

        window.app.updateTaskName = (index, val) => {
            window.editState.tasks[index].name = val;
        };

        window.app.updateTaskTime = (index, type, val) => {
            const t = window.editState.tasks[index];
            const v = parseInt(val) || 0;
            const mins = Math.floor(t.seconds / 60);
            const secs = t.seconds % 60;
            
            if (type === 'min') t.seconds = (v * 60) + secs;
            else t.seconds = (mins * 60) + v;
        };

        window.app.saveRoutine = () => {
            const name = nameEl.value.trim();
            if (!name) return alert('Please name your routine');
            if (window.editState.tasks.some(t => !t.name.trim())) return alert('Please name all tasks');

            const routine = {
                id: (params && params.id) || generateId(),
                name: name,
                tasks: window.editState.tasks
            };
            store.saveRoutine(routine);
            navigateTo('home');
        };

        // Initial render of tasks
        renderTasks();
    },

    cleanup: () => {
        delete window.editState;
        delete window.app.goHome;
        delete window.app.addTask;
        delete window.app.removeTask;
        delete window.app.updateTaskName;
        delete window.app.updateTaskTime;
        delete window.app.saveRoutine;
    }
};
