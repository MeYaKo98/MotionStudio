export interface PositionData {
    x: number;
    y: number;
    theta: number;
}

export interface DashboardState {
    connected: boolean;
    position: PositionData | null;
    trajectory: PositionData[];
}
