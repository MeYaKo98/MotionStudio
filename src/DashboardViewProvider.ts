import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

export interface PositionData {
    x: number;
    y: number;
    theta: number;
}

export class DashboardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'motion-studio.dashboard';

    private view: vscode.WebviewView | undefined;
    private isReady = false;
    private isConnected = false;
    private position: PositionData | undefined;
    private positionUpdatedAt: number | undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        view: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = view;
        this.isReady = false;
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
            }
        });
        view.onDidDispose(() => {
            if (this.view === view) {
                this.view = undefined;
                this.isReady = false;
            }
        });
    }

    public setConnected(connected: boolean): void {
        this.isConnected = connected;
        this.sendState();
    }

    public setPosition(position: PositionData): void {
        this.position = position;
        this.positionUpdatedAt = Date.now();
        this.sendState();
    }

    private sendState(): void {
        if (!this.view || !this.isReady) {
            return;
        }

        void this.view.webview.postMessage({
            type: 'dashboard-state',
            connected: this.isConnected,
            position: this.position ?? null,
            updatedAt: this.positionUpdatedAt ?? null
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