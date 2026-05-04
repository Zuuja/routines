import { HomeView } from './views/home.js';
import { EditView } from './views/edit.js';
import { RunView } from './views/run.js';
import { SummaryView } from './views/summary.js';
import { StatsView } from './views/stats.js';

const ROUTES = {
    'home': HomeView,
    'edit': EditView,
    'run': RunView,
    'summary': SummaryView,
    'stats': StatsView
};

let currentView = null;

export const navigateTo = (viewName, params = {}) => {
    // Cleanup old view
    if (currentView && currentView.cleanup) {
        currentView.cleanup();
    }

    const View = ROUTES[viewName] || HomeView;
    currentView = View;

    // Render new view
    const app = document.getElementById('app');
    app.innerHTML = View.render(params);

    // Attach listeners
    if (View.afterRender) {
        View.afterRender(params);
    }
};

// Initialize
window.app = {}; // Namespace for global handlers
document.addEventListener('DOMContentLoaded', () => {
    navigateTo('home');
    
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.log('SW Failed', err));
    }
});
