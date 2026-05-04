import { store } from '../store.js';
import { navigateTo } from '../app.js';
import { formatTime } from '../utils.js';

// SVG Icons
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const EDIT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
const CHART_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`;
const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;

export const HomeView = {
    render: () => {
        const routines = store.getRoutines();
        
        let html = `
            <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
                <h1>My Routines</h1>
            </div>
        `;

        if (routines.length === 0) {
            html += `
                <div class="card text-center" style="padding: 3rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">No routines yet.</p>
                    <p>Tap + to create one!</p>
                </div>
            `;
        } else {
            html += `<div class="flex-col gap-4">`;
            routines.forEach(r => {
                const totalSecs = r.tasks.reduce((acc, t) => acc + t.seconds, 0);
                html += `
                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <h2 style="margin:0; font-size: 1.25rem;">${r.name}</h2>
                            <span style="font-family: monospace; color: var(--text-secondary);">${formatTime(totalSecs)}</span>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${r.tasks.length} tasks</p>
                        
                        <div class="flex gap-2">
                            <button class="btn btn-primary flex-1" onclick="window.app.runRoutine('${r.id}')">
                                ${PLAY_ICON}
                            </button>
                            <button class="btn btn-secondary btn-icon" onclick="window.app.viewStats('${r.id}')" title="Stats">
                                ${CHART_ICON}
                            </button>
                            <button class="btn btn-secondary btn-icon" onclick="window.app.editRoutine('${r.id}')" title="Edit">
                                ${EDIT_ICON}
                            </button>
                            <button class="btn btn-danger btn-icon" onclick="window.app.deleteRoutine('${r.id}')" title="Delete">
                                ${TRASH_ICON}
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // FAB
        html += `
            <button class="fab" onclick="window.app.createRoutine()">
                ${PLUS_ICON}
            </button>
        `;

        return html;
    },
    
    // Attach global handlers for the onclick events in HTML string
    afterRender: () => {
        window.app.runRoutine = (id) => navigateTo('run', { id });
        window.app.viewStats = (id) => navigateTo('stats', { id });
        window.app.editRoutine = (id) => navigateTo('edit', { id });
        window.app.createRoutine = () => navigateTo('edit');
        window.app.deleteRoutine = (id) => {
            if(confirm('Delete this routine?')) {
                store.deleteRoutine(id);
                navigateTo('home');
            }
        };
    },

    cleanup: () => {
        delete window.app.runRoutine;
        delete window.app.viewStats;
        delete window.app.editRoutine;
        delete window.app.createRoutine;
        delete window.app.deleteRoutine;
    }
};
