import { store } from '../store.js';
import { navigateTo } from '../app.js';
import { formatTime } from '../utils.js';

const HOME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;

export const SummaryView = {
    render: (params) => {
        const routine = store.getRoutine(params.id);
        const history = store.getHistory(params.id);
        
        // Find specific run if timestamp provided, else last one
        let runData;
        if (params.timestamp) {
            runData = history.find(h => h.timestamp == params.timestamp);
        } else {
            runData = history[history.length - 1];
        }

        if (!runData) return `<p>No run data found.</p>`;

        const totalPlanned = runData.tasks.reduce((acc, t) => acc + t.planned, 0);
        const totalActual = runData.tasks.reduce((acc, t) => acc + (t.status === 'skipped' ? 0 : t.actual), 0); // Don't count time for skipped? Or do? Let's assume actual time spent is counted even if skipped. Actually usually 'skipped' implies 0 time or gave up. Let's count actual recorded time.
        
        let html = `
            <div class="text-center" style="margin-bottom: 2rem;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</h1>
                <h1>Routine Summary</h1>
                <p style="color: var(--text-secondary);">${new Date(runData.timestamp).toLocaleString()}</p>
            </div>

            <div class="card flex justify-between items-center" style="margin-bottom: 1.5rem;">
                <div class="text-center flex-1">
                    <small>Planned</small>
                    <div style="font-weight:bold; font-size: 1.25rem;">${formatTime(totalPlanned)}</div>
                </div>
                <div class="text-center flex-1" style="border-left: 1px solid var(--text-secondary);">
                    <small>Actual</small>
                    <div style="font-weight:bold; font-size: 1.25rem;">${formatTime(totalActual)}</div>
                </div>
            </div>

            <h3>Task Breakdown</h3>
            <div class="flex-col gap-2" style="margin-bottom: 2rem;">
        `;

        runData.tasks.forEach((t, i) => {
            const isSkipped = t.status === 'skipped';
            const diff = t.actual - t.planned;
            const isOver = diff > 0;
            const diffStr = formatTime(Math.abs(diff));
            
            let color = isOver ? 'var(--danger-color)' : 'var(--success-color)';
            let statusText = isOver ? `+${diffStr}` : `-${diffStr}`;
            
            if (isSkipped) {
                color = 'var(--text-secondary)';
                statusText = 'SKIPPED';
            }

            // Order info
            // t.originalIndex exists if recorded with new version. If undefined (old records), fallback to ?
            const orderInfo = t.originalIndex ? `Original #${t.originalIndex}` : '';
            const actualOrder = i + 1;
            const wasReordered = t.originalIndex && t.originalIndex !== actualOrder;

            html += `
                <div class="card" style="padding: 1rem; display:flex; justify-content:space-between; align-items:center; opacity: ${isSkipped ? 0.7 : 1}">
                    <div>
                        <div style="font-weight:600; text-decoration: ${isSkipped ? 'line-through' : 'none'}">${t.name}</div>
                        <small style="color: var(--text-secondary);">
                            Planned: ${formatTime(t.planned)} 
                            ${wasReordered ? `<br><span style="color:var(--primary-color)">Moved (was #${t.originalIndex})</span>` : ''}
                        </small>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold;">${formatTime(t.actual)}</div>
                        <small style="color: ${color}; font-weight: bold;">${statusText}</small>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <button class="btn btn-primary w-full" onclick="window.app.goHome()">
                ${HOME_ICON} <span style="margin-left:0.5rem">Back Home</span>
            </button>
        `;

        return html;
    },

    afterRender: () => {
        window.app.goHome = () => navigateTo('home');
    },

    cleanup: () => {
        delete window.app.goHome;
    }
};