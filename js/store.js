const STORAGE_KEY = 'routines_v3_data';

export class Store {
    constructor() {
        this.data = this._load();
    }

    _load() {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return { routines: [] };
        try {
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to parse storage', e);
            return { routines: [] };
        }
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    getRoutines() {
        return this.data.routines;
    }

    getRoutine(id) {
        return this.data.routines.find(r => r.id === id);
    }

    saveRoutine(routine) {
        const idx = this.data.routines.findIndex(r => r.id === routine.id);
        if (idx >= 0) {
            this.data.routines[idx] = routine;
        } else {
            this.data.routines.push(routine);
        }
        this._save();
    }

    saveRun(routineId, runData) {
        const routine = this.getRoutine(routineId);
        if (!routine) return;
        if (!routine.history) routine.history = [];
        routine.history.push(runData);
        this._save();
    }

    getHistory(routineId) {
        const routine = this.getRoutine(routineId);
        return routine ? (routine.history || []) : [];
    }

    deleteRoutine(id) {
        this.data.routines = this.data.routines.filter(r => r.id !== id);
        this._save();
    }
    
    // Add run stats later if needed
}

export const store = new Store();
