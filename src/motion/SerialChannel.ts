import { BaseChannel } from './BaseChannel';
import { SerialPort } from 'serialport';

/**
 * Serial port implementation for RS-232 communication
 */
export class SerialChannel extends BaseChannel {
  private port: any = null;
  private readonly serialPort: string;
  private readonly baudRate: number;
  private isConnected: boolean = false;

  /**
   * Constructor for SerialPort
   * @param serialPort The serial port name (e.g., "COM3", "/dev/ttyUSB0")
   * @param baudRate The baud rate for communication (default: 9600)
   */
  constructor(serialPort: string, baudRate: number = 921600) {
    super();
    this.serialPort = serialPort;
    this.baudRate = baudRate;
  }

  /**
   * Connect to the serial port
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.warn(`SerialChannel : Already Connected`);
      return true;
    }


      // Dynamic import to handle optional dependency
      this.port = new SerialPort({
        path: this.serialPort,
        baudRate: this.baudRate,
        autoOpen: true,
      });

      return new Promise((resolve) => {
        this.port.on('open', () => {
          this.isConnected = true;
          console.log(`Serial Channel : Connected to serial port ${this.serialPort} at ${this.baudRate} baud`);
          resolve(true);
        });

        this.port.on('error', (error: Error) => {
          console.error(`SerialChannel : Connection error: ${error.message}`);
          resolve(false);
        });
      });
  }

  /**
   * Disconnect from the serial port
   */
  async disconnect(): Promise<boolean> {
    if (!this.isConnected || !this.port) {
      console.warn(`SerialChannel : Not connected!`);
      return true;
    }

    return new Promise((resolve) => {
      this.port.close((error: Error | null) => {
        if (error) {
          console.error(`SerialChannel : Error closing serial port: ${error.message}`);
          resolve(false);
        } else {
          this.isConnected = false;
          console.log(`SerialChannel : Disconnected from serial port ${this.serialPort}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Read data from the serial port
   */
  async read(): Promise<Buffer | null> {
    if (!this.isConnected || !this.port) {
      console.warn('SerialChannel : Serial port is not connected');
      return null;
    }

    return new Promise((resolve) => {
      this.port.once('data', (data: Buffer) => {
        resolve(data);
      });

      setTimeout(() => {
        resolve(null);
      }, 500);
    });
  }

  /**
   * Write data to the serial port
   * @param data The data buffer to write
   */
  async write(data: Buffer): Promise<boolean> {
    if (!this.isConnected || !this.port) {
      console.warn('SerialChannel : Serial port is not connected');
      return false;
    }

    return new Promise((resolve) => {
      this.port.write(data, (error: Error | null) => {
        if (error) {
          console.error(`SerialChannel : Error writing to serial port: ${error.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}
