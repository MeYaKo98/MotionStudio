import * as vscode from 'vscode';
import { MotionLink } from '../motion/MotionLink';
import { DashboardStateStore } from './DashboardStateStore';

export class ConnectionStatusMonitor {
    private statusCheckTimer: ReturnType<typeof setInterval> | undefined;
    private isCheckingStatus = false;
    private consecutivePositionFailures = 0;
    private readonly maxConsecutivePositionFailures = 3;

    constructor(
        private readonly motionLink: MotionLink,
        private readonly dashboardState: DashboardStateStore
    ) {}

    public updateConnectionStatus(status: boolean): void {
        this.dashboardState.setConnected(status);

        if (status) {
            this.startMonitoring();
            return;
        }

        this.stopMonitoring();
    }

    public dispose(): void {
        this.stopMonitoring();
    }

    private startMonitoring(): void {
        if (this.statusCheckTimer) {
            return;
        }

        this.statusCheckTimer = setInterval(async () => {
            if (this.isCheckingStatus) {
                return;
            }

            this.isCheckingStatus = true;

            try {
                try {
                    const result = await this.motionLink.handleCommand('getposition', []);
                    const position = result.data;

                    if (result.success && position &&
                        typeof position.x === 'number' &&
                        typeof position.y === 'number' &&
                        typeof position.theta === 'number') {
                        if (!this.dashboardState.getState().connected) {
                            return;
                        }

                        this.dashboardState.setPosition({
                            x: position.x,
                            y: position.y,
                            theta: position.theta
                        });

                        this.consecutivePositionFailures = 0;
                        return;
                    }
                } catch (error) {
                    console.error(`Motion Link : Status check error: ${error}`);
                }

                if (!this.dashboardState.getState().connected) {
                    return;
                }

                this.consecutivePositionFailures++;

                if (this.consecutivePositionFailures < this.maxConsecutivePositionFailures) {
                    console.warn(`Motion Link : Position check failed (${this.consecutivePositionFailures}/${this.maxConsecutivePositionFailures}); keeping connection open.`);
                    return;
                }

                this.stopMonitoring();

                try {
                    await MotionLink.disconnect();
                } catch (error) {
                    console.error(`Motion Link : Disconnect error: ${error}`);
                } finally {
                    this.updateConnectionStatus(false);
                }

                vscode.window.showErrorMessage('Motion Link : Status check failed; disconnected.');
            } finally {
                this.isCheckingStatus = false;
            }
        }, 100);
    }

    private stopMonitoring(): void {
        if (this.statusCheckTimer) {
            clearInterval(this.statusCheckTimer);
            this.statusCheckTimer = undefined;
        }
    }
}
