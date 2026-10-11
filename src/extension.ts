import * as vscode from 'vscode';
import { MotionLink } from './motion/MotionLink';
import { MotionCLI } from './motion/MotionCLI';
import { DashboardViewProvider } from './dashboard/DashboardViewProvider';
import { ConnectionStatusMonitor } from './services/ConnectionStatusMonitor';
import { DashboardStateStore } from './services/DashboardStateStore';
import { DeviceDiscoveryService } from './services/DeviceDiscoveryService';

const medias = [
    {
        label: 'TCP/IP',
    },
    {
        label: 'Serial',
    },
];

const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

export function activate(context: vscode.ExtensionContext) {
    console.log('Motion Studio is now active!');

    const dashboardStateStore = new DashboardStateStore();
    const dashboardViewProvider = new DashboardViewProvider(context.extensionUri, dashboardStateStore);
    const discoveryService = new DeviceDiscoveryService();
    const connectionStatusMonitor = new ConnectionStatusMonitor(MotionLink.getInstance(), dashboardStateStore);

    const updateStatusBar = () => {
        const connected = dashboardStateStore.getState().connected;

        if (connected) {
            myStatusBarItem.command = 'motion-studio.disconnect';
            myStatusBarItem.text = '$(debug-disconnect) Motion Link';
            myStatusBarItem.tooltip = 'Motion Link : Disconnect';
        } else {
            myStatusBarItem.command = 'motion-studio.connect';
            myStatusBarItem.text = '$(plug) Motion Link';
            myStatusBarItem.tooltip = 'Motion Link : Connect';
        }

        myStatusBarItem.show();
    };

    const unsubscribeState = dashboardStateStore.subscribe(() => {
        vscode.commands.executeCommand('setContext', 'motion-studio.isConnected', dashboardStateStore.getState().connected);
        updateStatusBar();
    });

    context.subscriptions.push(
        { dispose: unsubscribeState },
        connectionStatusMonitor,
        vscode.window.registerWebviewViewProvider(
            DashboardViewProvider.viewType,
            dashboardViewProvider
        )
    );

    updateStatusBar();

    const provider = vscode.window.registerTerminalProfileProvider(
        'motion-studio.cli',
        {
            provideTerminalProfile(): vscode.ProviderResult<vscode.TerminalProfile> {
                const cli = MotionCLI.getInstance();
                const options: vscode.ExtensionTerminalOptions = {
                    name: 'Motion Command Line Interface',
                    pty: cli.createPty()
                };
                return new vscode.TerminalProfile(options);
            }
        }
    );

    const command = vscode.commands.registerCommand('motion-studio.open-cli', () => {
        MotionCLI.getInstance().show();
    });

    context.subscriptions.push(provider, command);

    context.subscriptions.push(
        vscode.commands.registerCommand('motion-studio.connect', async () => {
            const media = await vscode.window.showQuickPick(medias);

            if (media?.label === 'TCP/IP') {
                const devices = (await discoveryService.getAvailableTCPIPDevices())
                    .map(device => ({
                        label: device.name,
                        detail: device.referer?.address
                    }));

                if (devices.length === 0) {
                    vscode.window.showErrorMessage('Motion Link : No devices discovered over the network.');
                    return;
                }

                const selectedDevice = await vscode.window.showQuickPick(devices);
                if (!selectedDevice?.detail) {
                    return;
                }

                const result = await MotionLink.connectTCPIP(selectedDevice.detail);
                if (result) {
                    vscode.window.showInformationMessage(`Motion Link : Connected via TCP/IP : ${selectedDevice.label}`);
                    connectionStatusMonitor.updateConnectionStatus(true);
                    return;
                }

                vscode.window.showErrorMessage(`Motion Link : Failed to connect via TCP/IP : ${selectedDevice.label}`);
                return;
            }

            if (media?.label === 'Serial') {
                const ports = (await discoveryService.getAvailableSerialPorts())
                    .map(port => ({
                        label: port.path,
                        detail: port.manufacturer || 'Unknown Manufacturer'
                    }));

                if (ports.length === 0) {
                    vscode.window.showErrorMessage('Motion Link : No serial ports found.');
                    return;
                }

                const selectedPort = await vscode.window.showQuickPick(ports);
                if (!selectedPort) {
                    return;
                }

                const result = await MotionLink.connectSerial(selectedPort.label);
                if (result) {
                    vscode.window.showInformationMessage(`Motion Link : Connected via Serial : ${selectedPort.label}`);
                    connectionStatusMonitor.updateConnectionStatus(true);
                    return;
                }

                vscode.window.showErrorMessage(`Motion Link : Failed to connect via Serial : ${selectedPort.label}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('motion-studio.disconnect', async () => {
            connectionStatusMonitor.updateConnectionStatus(false);
            const result = await MotionLink.disconnect();

            if (result) {
                vscode.window.showInformationMessage('Motion Link : Disconnected');
            } else {
                vscode.window.showErrorMessage('Motion Link : Failed to disconnect');
            }
        })
    );
}

export function deactivate() {
    myStatusBarItem.dispose();
}
