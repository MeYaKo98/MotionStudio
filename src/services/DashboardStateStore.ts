import { DashboardState, PositionData } from '../types/dashboard';

export class DashboardStateStore {
    private state: DashboardState = {
        connected: false,
        position: null,
        trajectory: []
    };

    private readonly listeners = new Set<(state: DashboardState) => void>();

    public subscribe(listener: (state: DashboardState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): DashboardState {
        return {
            connected: this.state.connected,
            position: this.state.position ? { ...this.state.position } : null,
            trajectory: this.state.trajectory.map(point => ({ ...point }))
        };
    }

    public setConnected(connected: boolean): void {
        const wasConnected = this.state.connected;
        this.state.connected = connected;

        if (connected && !wasConnected) {
            this.state.position = null;
            this.state.trajectory = [];
        }

        this.emit();
    }

    public setPosition(position: PositionData): void {
        if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.theta)) {
            return;
        }

        this.state.position = { ...position };
        this.state.trajectory.push({ ...position });

        if (this.state.trajectory.length > 2000) {
            this.state.trajectory = this.state.trajectory.slice(-2000);
        }

        this.emit();
    }

    public resetTrajectory(): void {
        this.state.trajectory = [];
        this.emit();
    }

    private emit(): void {
        const snapshot = this.getState();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
