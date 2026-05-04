import { store } from '../store.js';
import { navigateTo } from '../app.js';
import { formatTime } from '../utils.js';

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`;

export const StatsView = {
    render: (params) => {
        const routine = store.getRoutine(params.id);
        if (!routine) return `<p>Routine not found</p>`;

        const history = (routine.history || []).sort((a, b) => b.timestamp - a.timestamp); // Newest first
        
        // --- Activity Grid Logic ---
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Calculate the Monday of the current week
        // getDay(): 0=Sun, 1=Mon...
        const currentDay = today.getDay(); 
        // Calculate how many days to subtract to get to Monday.
        // If Mon(1) -> 0. Tue(2) -> 1. ... Sun(0) -> 6.
        const daysSinceMonday = (currentDay + 6) % 7;
        
        const mondayOfThisWeek = new Date(today);
        mondayOfThisWeek.setDate(today.getDate() - daysSinceMonday);

        // We want 5 weeks total. So go back 4 weeks from this week's Monday.
        const startDate = new Date(mondayOfThisWeek);
        startDate.setDate(mondayOfThisWeek.getDate() - (4 * 7));

        const runsByDate = {};
        history.forEach(h => {
            const dStr = new Date(h.timestamp).toDateString();
            if (!runsByDate[dStr]) {
                runsByDate[dStr] = h;
            }
        });

        // Day Labels (Monday start)
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        let gridHtml = `
            <div class="stats-container">
                <div class="stats-grid-header">
                    ${days.map(d => `<span>${d}</span>`).join('')}
                </div>
                <div class="stats-grid">
        `;
        
        // 5 weeks * 7 days = 35 cells
        for (let i = 0; i < 35; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dStr = d.toDateString();
            const run = runsByDate[dStr];
            
            let cellClass = 'grid-empty';
            let title = d.toLocaleDateString();
            const isFuture = d > today;

            if (run) {
                let netDiff = 0;
                run.tasks.forEach(t => {
                    if (t.status !== 'skipped') {
                        netDiff += (t.actual - t.planned);
                    }
                });

                if (netDiff <= 0) cellClass = 'grid-success';
                else cellClass = 'grid-over';
                
                title += ` - ${netDiff <= 0 ? 'In Time' : 'Over Time'}`;
            } else if (isFuture) {
                cellClass = 'grid-future'; // CSS for invisible/lighter
            }

            const isToday = d.getTime() === today.getTime();
            if (isToday) cellClass += ' grid-today';

            gridHtml += `<div class="grid-cell ${cellClass}" title="${title}"></div>`;
        }
        gridHtml += `
                </div>
            </div>
            <!-- Legend -->
            <div class="flex gap-4 justify-center" style="font-size: 0.8rem; margin-bottom: 2rem;">
                <div class="flex items-center gap-1"><div class="grid-cell grid-success legend-cell"></div> In</div>
                <div class="flex items-center gap-1"><div class="grid-cell grid-over legend-cell"></div> Over</div>
                <div class="flex items-center gap-1"><div class="grid-cell grid-empty legend-cell"></div> No</div>
            </div>`;


        // --- Stats Calculation ---
        const totalRuns = history.length;
        let streak = 0;
        if (totalRuns > 0) {
            const runsByDaySet = new Set(history.map(h => new Date(h.timestamp).setHours(0,0,0,0)));
            const lastRunTime = history[0] ? new Date(history[0].timestamp).setHours(0,0,0,0) : 0;
            const yesterday = today.getTime() - 86400000;
            
            if (lastRunTime >= yesterday) {
                let checkDate = lastRunTime;
                while (runsByDaySet.has(checkDate)) {
                    streak++;
                    checkDate -= 86400000;
                }
            }
        }

        let html = `
            <div class="flex items-center gap-2" style="margin-bottom: 1.5rem;">
                <button class="btn btn-secondary btn-icon" onclick="window.app.goHome()">
                    ${BACK_ICON}
                </button>
                <h1>Stats: ${routine.name}</h1>
            </div>

            <div class="flex gap-4" style="margin-bottom: 2rem;">
                <div class="card flex-1 text-center">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${totalRuns}</div>
                    <small style="color: var(--text-secondary);">Total Runs</small>
                </div>
                <div class="card flex-1 text-center">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${streak}</div>
                    <small style="color: var(--text-secondary);">Day Streak</small>
                </div>
            </div>

            <h3>Activity (Last 5 Weeks)</h3>
            ${gridHtml}

            <h3>Run History</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Tap a run to see details</p>
        `;

        if (history.length === 0) {
            html += `<p style="color: var(--text-secondary);">No runs recorded yet.</p>`;
        } else {
            html += `<div class="flex-col gap-2">`;
            history.forEach(run => {
                const date = new Date(run.timestamp);
                const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let totalActual = 0;
                let netDiff = 0;
                let skippedCount = 0;

                run.tasks.forEach(t => {
                    totalActual += t.actual;
                    if (t.status === 'skipped') {
                        skippedCount++;
                    } else {
                        netDiff += (t.actual - t.planned);
                    }
                });

                const isOver = netDiff > 0;
                const absDiff = Math.abs(netDiff);
                const diffTimeStr = formatTime(absDiff).replace('+', '');
                const diffSign = isOver ? '+' : '-';
                const diffColor = isOver ? 'var(--primary-color)' : 'var(--success-color)';
                const diffLabel = `${diffSign}${diffTimeStr}`;
                
                html += `
                    <div class="card" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.app.viewRunDetails('${routine.id}', ${run.timestamp})">
                        <div>
                            <div style="font-weight: 600;">${dayName}</div>
                            <small style="color: var(--text-primary);">${dateStr}</small><br>
                            <small style="color: var(--text-secondary);">${timeStr}</small>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-family: monospace; font-size: 1.1rem; font-weight: bold;">
                                ${formatTime(totalActual).replace('+', '')}
                            </div>
                            <small style="color: ${diffColor}; font-weight: bold;">
                                ${diffLabel}
                            </small>
                            ${skippedCount > 0 ? `<br><small style="color: var(--text-secondary); opacity: 0.8;">${skippedCount} skipped</small>` : ''}
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        return html;
    },

    afterRender: () => {
        window.app.goHome = () => navigateTo('home');
        window.app.viewRunDetails = (rid, ts) => navigateTo('summary', { id: rid, timestamp: ts });
    },

    cleanup: () => {
        delete window.app.goHome;
        delete window.app.viewRunDetails;
    }
};