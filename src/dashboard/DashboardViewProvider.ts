import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { DashboardStateStore } from '../services/DashboardStateStore';
import { DashboardState, PositionData } from '../types/dashboard';

export { PositionData };

export class DashboardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'motion-studio.dashboard';

    private view: vscode.WebviewView | undefined;
    private isReady = false;
    private readonly stateStore: DashboardStateStore;
    private unsubscribeFromState: (() => void) | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        stateStore?: DashboardStateStore
    ) {
        this.stateStore = stateStore ?? new DashboardStateStore();
    }

    public resolveWebviewView(
        view: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = view;
        this.isReady = false;

        this.unsubscribeFromState = this.stateStore.subscribe(state => this.sendState(state));

        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'images')
            ]
        };

        view.webview.html = this.getHtml(view.webview);
        view.webview.onDidReceiveMessage(message => {
            if (message?.type === 'ready') {
                this.isReady = true;
                this.sendState();
            } else if (message?.type === 'reset-trajectory') {
                this.stateStore.resetTrajectory();
            } else if (message?.type === 'open-cli') {
                vscode.commands.executeCommand('motion-studio.open-cli');
            }
        });

        view.onDidDispose(() => {
            if (this.view === view) {
                this.unsubscribeFromState?.();
                this.view = undefined;
                this.isReady = false;
            }
        });
    }

    public setConnected(connected: boolean): void {
        this.stateStore.setConnected(connected);
    }

    public setPosition(position: PositionData): void {
        this.stateStore.setPosition(position);
    }

    private sendState(state: DashboardState = this.stateStore.getState()): void {
        if (!this.view || !this.isReady) {
            return;
        }

        void this.view.webview.postMessage({
            type: 'dashboard-state',
            connected: state.connected,
            position: state.position ?? null,
            trajectory: state.trajectory
        });
    }

    private getHtml(webview: vscode.Webview): string {
        const nonce = randomBytes(16).toString('base64');
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'dashboard.js')
        );
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'images', 'logo.png')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Motion Studio Dashboard</title>
</head>
<body>
    <div id="app" data-logo-src="${logoUri}"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}