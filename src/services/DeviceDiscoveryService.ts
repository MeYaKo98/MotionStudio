import { SerialPort } from 'serialport';
import { Bonjour, Service } from 'bonjour-service';
import os from 'os';

export class DeviceDiscoveryService {
    public async getAvailableSerialPorts(): Promise<any[]> {
        try {
            const ports = await SerialPort.list();

            if (ports.length === 0) {
                console.log('No serial ports found.');
                return [];
            }

            return ports.filter(port => !!(port.vendorId || port.productId));
        } catch (error) {
            console.error(`Error listing serial ports: ${error}`);
            return [];
        }
    }

    public async getAvailableTCPIPDevices(timeoutMs: number = 1000): Promise<Service[]> {
        const devices = new Map<string, Service>();
        const networkInterfaces = os.networkInterfaces();
        const activeInterfaces: string[] = [];

        for (const name of Object.keys(networkInterfaces)) {
            for (const net of networkInterfaces[name] ?? []) {
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
}
