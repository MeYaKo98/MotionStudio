import { BaseChannel } from './BaseChannel';
import * as net from 'net';

/**
 * TCP/IP client implementation for network communication
 */
export class TCPClient extends BaseChannel {
  private socket: net.Socket | null = null;
  private readonly ipAddress: string;
  private readonly port: number;
  private isConnected: boolean = false;

  /**
   * Constructor for TCPClient
   * @param ipAddress The IP address to connect to (e.g., "192.168.1.100")
   * @param port The port number for TCP connection (e.g., 9500)
   */
  constructor( ipAddress: string, port: number = 9500 ) {
    super();
    this.ipAddress = ipAddress;
    this.port = port;
  }

  /**
   * Connect to the TCP server
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.socket) {
      console.warn(`TCP client : Already connected to ${this.ipAddress}:${this.port}`);
      return true;
    }

    return new Promise((resolve) => {
      this.socket = net.createConnection({
        host: this.ipAddress,
        port: this.port,
      });

      const connectionTimeout = setTimeout(() => {
        this.socket?.destroy();
        console.log(`TCPClient : Connect Timeout`);
        resolve(false);
      }, 500);

      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        setTimeout(() => {
          if (this.socket && !this.socket.destroyed) {
            console.log(`TCPClient : Connected to TCP server at ${this.ipAddress}:${this.port}`);
            resolve(true);
          }
        }, 50);
      });

      this.socket.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);
        console.error(`TCPClient : TCP connection error: ${error.message}`);
        resolve(false);
      });

      this.socket.on('close', () => {
        this.isConnected = false;
        console.log(`TCPClient : Disconnected from TCP server after Connect`);
        this.socket?.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Disconnect from the TCP server
   */
  async disconnect(): Promise<boolean> {
    if (!this.isConnected || !this.socket) {
      console.warn(`TCP client : Not connected!`);
      return true;
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            this.socket?.destroy();
            console.log(`TCPClient : Disconnected/Socket Destroyed!`);
            resolve(true);
        }, 500);

        this.socket?.end(() => {
            this.isConnected = false;
            console.log(`TCPClient : Disconnected from ${this.ipAddress}:${this.port}`);
            resolve(true);
        });
    });
  }

  /**
   * Read data from the TCP socket (awaits next data event)
   */
  async read(): Promise<Buffer | null> {
    if (!this.isConnected || !this.socket) {
      console.warn('TCP client is not connected');
      return null;
    }

    return new Promise((resolve) => {
      const dataHandler = (data: Buffer) => {
        this.socket?.removeListener('data', dataHandler);
        resolve(data);
      };

      this.socket?.once('data', dataHandler);

      // Optional: Set a timeout to avoid hanging
      setTimeout(() => {
        this.socket?.removeListener('data', dataHandler);
        resolve(null);
      }, 500);
    });
  }

  /**
   * Write data to the TCP socket
   * @param data The data buffer to write
   */
  async write(data: Buffer): Promise<boolean> {
    if (!this.isConnected || !this.socket) {
        console.warn('TCP client is not connected');
        return false;
    }

    return new Promise((resolve) => {
      this.socket!.write(data, (error: Error | null | undefined) => {
        if (error) {
          console.error(`TCPClient : Error writing to TCP socket: ${error.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}
