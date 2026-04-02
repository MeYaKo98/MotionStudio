import * as vscode from 'vscode';
import { BaseChannel } from './BaseChannel';
import { SerialChannel } from './SerialChannel';
import { TCPClient } from './TCPClient';
import { Handlers, SchemaType, COMMAND_DEFS } from './MotionBridge';

/**
 * Result type returned by handleCommand for both success and error cases.
 */
export interface CommandResult {
    success: boolean;
    name?: string;
    hexSent?: string;
    hexReceived?: string;
    data?: Record<string, any>;
    dataStr?: string;
    error?: string;
    usage?: string;
}

/**
 * MotionLink handles complete protocol command lifecycle including:
 * - Connection management (TCP/IP and Serial)
 * - Command serialization and deserialization
 * - Command transmission and response reception
 * - Supports both CLI and programmatic command execution
 */
export class MotionLink {
    private static instance: MotionLink;
    private static communicationChannel: BaseChannel | null = null;

    public static getInstance(): MotionLink {
        if (!this.instance) this.instance = new MotionLink();
        return this.instance;
    }

    /**
     * Serialize a command into a binary buffer.
     * @param name - Command name
     * @param inputValues - Array of input values
     * @returns Serialized Buffer
     */
    public static serialize(name: string, inputValues: any[]): Buffer {
        const cmd = COMMAND_DEFS[name];
        if (!cmd) throw new Error(`Unknown command: ${name}`);
        if (inputValues.length !== cmd.params.length) {
            throw new Error(`Expected ${cmd.params.length} arguments: ${cmd.params.map(p => p.key).join(', ')}`);
        }

        const payloadSize = cmd.params.reduce((acc, field, i) => acc + Handlers[field.type].size(inputValues[i]), 0);
        const buffer = Buffer.alloc(4 + payloadSize);

        buffer.writeUInt16LE(cmd.code, 0);
        buffer.writeUInt16LE(payloadSize, 2);

        let offset = 4;
        cmd.params.forEach((field, i) => {
            offset = Handlers[field.type].write(buffer, offset, inputValues[i]);
        });
        return buffer;
    }

    /**
     * Deserialize a response buffer into parsed data.
     * @param buffer - Response buffer
     * @param commandName - Name of the command
     * @returns Parsed response with name and data
     */
    public static deserializeResponse(buffer: Buffer, commandName: string): { name: string; data: Record<string, any> } {
        if (buffer.length < 4) throw new Error("Packet too small");

        const status = buffer.readInt16LE(0);
        const dataLength = buffer.readInt16LE(2);
        
        if (status !== 0) {
            throw new Error(`Command failed with status: ${status}`);
        }

        const cmd = COMMAND_DEFS[commandName];
        const data: Record<string, any> = {};
        let offset = 4;

        for (const field of cmd.outputs) {
            const result = Handlers[field.type].read(buffer, offset);
            data[field.key] = result.value;
            offset = result.offset;
        }

        return { name: commandName, data };
    }

    /**
     * Connect to device via TCP/IP.
     * @param address - Device address (IP:port)
     * @returns Connection success
     */
    public static async connectTCPIP(address: string): Promise<boolean> {
        MotionLink.communicationChannel = new TCPClient(address);
        return await MotionLink.communicationChannel.connect();
    }

    /**
     * Connect to device via Serial port.
     * @param port - Serial port name
     * @returns Connection success
     */
    public static async connectSerial(port: string): Promise<boolean> {
        MotionLink.communicationChannel = new SerialChannel(port);
        return await MotionLink.communicationChannel.connect();
    }

    /**
     * Disconnect from device.
     * @returns Disconnection success
     */
    public static async disconnect(): Promise<boolean> {
        if (MotionLink.communicationChannel) {
            const result = await MotionLink.communicationChannel.disconnect();
            if (result) {
                MotionLink.communicationChannel = null;
            }
            return result;
        }
        return false;
    }

    /**
     * Check if connected to device.
     * @returns Connection status
     */
    public static isConnected(): boolean {
        return MotionLink.communicationChannel !== null;
    }

    /**
     * Get the current communication channel.
     * @returns Current channel or null
     */
    public static getChannel(): BaseChannel | null {
        return MotionLink.communicationChannel;
    }

    /**
     * Handle a protocol command with validation, serialization, transmission, and deserialization.
     * Supports both CLI and programmatic usage.
     * 
     * @param name - The command name
     * @param rawArgs - Array of string arguments
     * @returns A result object with status, hex values, and response data or error info
     */
    public async handleCommand(name: string, rawArgs: string[]): Promise<CommandResult> {
        const cmd = COMMAND_DEFS[name];
        
        // Validate argument count
        if (rawArgs.length !== cmd.params.length) {
            return {
                success: false,
                error: `Expected ${cmd.params.length} argument(s), got ${rawArgs.length}`,
                usage: `${name} ${cmd.params.map(p => `<${p.key}:${p.type}>`).join(' ')}`
            };
        }

        // Validate and convert arguments
        const args: any[] = [];
        for (let i = 0; i < rawArgs.length; i++) {
            const param = cmd.params[i];
            const rawValue = rawArgs[i];
            const converted = this.validateAndConvertArg(rawValue, param.type);
            
            if (converted === null) {
                return {
                    success: false,
                    error: `Argument '${rawValue}' is not a valid ${param.type}`,
                    usage: `${name} ${cmd.params.map(p => `<${p.key}:${p.type}>`).join(' ')}`
                };
            }
            args.push(converted);
        }

        // Serialize and send
        const buffer = MotionLink.serialize(name, args);
        
        // Send to communication channel and wait for response
        return await this.sendAndReceive(name, buffer);
    }

    private async sendAndReceive(name: string, buffer: Buffer): Promise<CommandResult> {
        const channel = MotionLink.getChannel();
        
        if (!channel) {
            return {
                success: false,
                error: "Not connected to device"
            };
        }

        // Send the command
        const sendSuccess = await channel.write(buffer);
        if (!sendSuccess) {
            return {
                success: false,
                error: "Failed to send command"
            };
        }

        // Receive response
        const responseBuffer = await channel.read();
        if (!responseBuffer) {
            return {
                success: false,
                error: "No response from device"
            };
        }

        // Deserialize and prepare response
        try {
            const response = MotionLink.deserializeResponse(responseBuffer, name);
            
            let dataStr = '';
            if (Object.keys(response.data).length > 0) {
                const cmd = COMMAND_DEFS[response.name];
                dataStr = cmd.outputs
                    .map(o => `${o.key}:${o.type}=${response.data[o.key]}`)
                    .join(', ');
            }

            return {
                success: true,
                name: response.name,
                hexSent: buffer.toString('hex'),
                hexReceived: responseBuffer.toString('hex'),
                data: response.data,
                dataStr
            };
        } catch (e: any) {
            return {
                success: false,
                error: `Failed to deserialize response - ${e.message}`
            };
        }
    }

    private validateAndConvertArg(value: string, type: SchemaType): any {
        return Handlers[type].validate(value);
    }
}
