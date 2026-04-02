import * as vscode from 'vscode';
import { SerialPort } from 'serialport';
import { Bonjour, Service } from 'bonjour-service';
import os from 'os';
import { MotionLink } from './MotionLink';
import { MotionCLI } from './MotionCLI';

const medias = [
    {
        label: "TCP/IP",
    },
    {
        label: "Serial",
    },
];

let isConnected = false;
const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
function updateStatusBar() {
    if (isConnected) {
        myStatusBarItem.command = 'motion-studio.disconnect';
        myStatusBarItem.text = `$(debug-disconnect) Motion Link`; 
        myStatusBarItem.tooltip = 'Motion Link : Disconnect';
    } else {
        myStatusBarItem.command = 'motion-studio.connect';
        myStatusBarItem.text = `$(plug) Motion Link`; 
        myStatusBarItem.tooltip = 'Motion Link : Connect';
    }
    myStatusBarItem.show();
}
function updateConnectionStatus(status : boolean) {
    isConnected = status;
    vscode.commands.executeCommand('setContext', 'motion-studio.isConnected', status);
    updateStatusBar();
}

async function getAvailableSerialPorts(): Promise<any[]> {
    try {
        const ports = await SerialPort.list();

        if (ports.length === 0) {
            console.log('No serial ports found.');
            return [];
        }

        const usbFilteredPorts = ports.filter(port => {
            const isUsbDevice = !!(port.vendorId || port.productId);
            return isUsbDevice;
        });

        return usbFilteredPorts;
    } catch (error) {
        console.error(`Error listing serial ports: ${error}`);
        return [];
    }
}


export async function getAvailableTPCIPDevices(timeoutMs: number = 1000): Promise<Service[]> {
    const devices = new Map<string, Service>();
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces: string[] = [];

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]!) {
            if (net.family === 'IPv4') {
                activeInterfaces.push(net.address);
            }
        }
    }

    const instances = activeInterfaces.map(ip => {
        const bj = new Bonjour({ interface: ip } as any);
        const browser = bj.find({ type: 'MotionLink' });

        browser.on('up', (service: Service) => {
            const id = service.addresses?.[0] || service.host;
            devices.set(id, service);
        });

        return { bj, browser };
    });

    return new Promise((resolve) => {
        setTimeout(() => {
            instances.forEach(({ bj, browser }) => {
                browser.stop();
                bj.destroy();
            });
            resolve(Array.from(devices.values()));
        }, timeoutMs);
    });

}

export function activate(context: vscode.ExtensionContext) {
    console.log('Motion Studio is now active!');
    updateStatusBar();

    // The Profile Provider for the dropdown menu
    const provider = vscode.window.registerTerminalProfileProvider(
        'motion-studio.cli', 
        {
            provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
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

    //Connect function
    context.subscriptions.push(
        vscode.commands.registerCommand('motion-studio.connect',
        async function () {
            const media = await vscode.window.showQuickPick(medias);
            if (media?.label == 'TCP/IP')
            {
                const devices = (await getAvailableTPCIPDevices())
                .map(
                    device => {
                        return {
                            label: device.name,
                            detail: device.referer?.address
                        }
                    }
                );
                if (devices.length == 0)
                {
                    vscode.window.showErrorMessage("Motion Link : No devices discovered over the network.");
                    return;
                }
                else
                {
                    const selectedDevice = await vscode.window.showQuickPick(devices);
                    if (selectedDevice?.detail)
                    {
                        const result = await MotionLink.connectTCPIP(selectedDevice.detail);
                        if (result)
                        {
                            vscode.window.showInformationMessage(`Motion Link : Connected via TCP/IP : ${selectedDevice.label}`);
                            updateConnectionStatus(true);
                        }
                        else
                        {
                            vscode.window.showErrorMessage(`Motion Link : Failed to connect via TCP/IP : ${selectedDevice.label}`);
                        }
                    }
                }
            }
            else if (media?.label == 'Serial')
            {
                const ports = (await getAvailableSerialPorts())
                .map(
                    port => {
                        return {
                            label: port.path,
                            detail: port.manufacturer || 'Unknown Manufacturer'
                        }
                    }
                );
                if (ports.length == 0)
                {
                    vscode.window.showErrorMessage("Motion Link : No serial ports found.");
                    return;
                }
                else
                {
                    const selectedPort = await vscode.window.showQuickPick(ports);
                    if (selectedPort)
                    {
                        const result = await MotionLink.connectSerial(selectedPort.label);
                        if (result)
                        {
                            vscode.window.showInformationMessage(`Motion Link : Connected via Serial : ${selectedPort.label}`);
                            updateConnectionStatus(true);
                        }
                        else
                        {
                            vscode.window.showErrorMessage(`Motion Link : Failed to connect via Serial : ${selectedPort.label}`);
                        }
                    }
                }
            }
        })
    );

    //Disconnect function
    context.subscriptions.push(
        vscode.commands.registerCommand('motion-studio.disconnect',
        async function () {
            const result = await MotionLink.disconnect();
            if (result)
            {
                vscode.window.showInformationMessage("Motion Link : Disconnected");
            }
            else
            {
                vscode.window.showErrorMessage(`Motion Link : Failed to disconnect`);
            }
            updateConnectionStatus(false);
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
