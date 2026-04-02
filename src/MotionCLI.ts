import * as vscode from 'vscode';
import { MotionLink } from './MotionLink';
import { COMMAND_DEFS } from './MotionBridge';

/**
 * MotionCLI handles the terminal interface and interactive command-line experience.
 * It delegates protocol command execution to MotionLink.
 */
export class MotionCLI {
    private static instance: MotionCLI;
    private terminal: vscode.Terminal | undefined;
    private writeEmitter = new vscode.EventEmitter<string>();
    private lineBuffer: string = "";
    private history: string[] = [];
    private historyIndex: number = -1;
    private readonly MAX_HISTORY = 20;

    public static getInstance(): MotionCLI {
        if (!this.instance) this.instance = new MotionCLI();
        return this.instance;
    }

    public show() {
        if (!this.terminal) {
            this.terminal = vscode.window.createTerminal({
                name: "MotionLink CLI",
                pty: this.createPty()
            });
        }
        this.terminal.show();
    }

    private log(message: string, color: 'green' | 'red' | 'yellow' = 'yellow') {
        const codes = { green: '32', red: '31', yellow: '33' };
        this.writeEmitter.fire(`\x1b[${codes[color]}m${message}\x1b[0m\r\n`);
    }

    private clearCurrentLine() {
        this.writeEmitter.fire('\b \b'.repeat(this.lineBuffer.length));
        this.lineBuffer = "";
    }

    private async processInput(input: string) {
        const cleanInput = input.trim();
        if (!cleanInput) {
            this.writeEmitter.fire('$ ');
            return;
        }

        // Handle History with 20-entry limit
        if (this.history[this.history.length - 1] !== cleanInput) {
            this.history.push(cleanInput);
            if (this.history.length > this.MAX_HISTORY) {
                this.history.shift(); // Remove oldest
            }
        }
        this.historyIndex = -1;

        const parts = cleanInput.toLowerCase().split(/\s+/);
        const commandName = parts[0];
        const rawArgs = parts.slice(1);

        try {
            switch (commandName) {
                case 'help':
                    this.displayHelp();
                    break;
                case 'clear':
                    this.writeEmitter.fire('\x1bc');
                    break;
                default:
                    if (COMMAND_DEFS[commandName]) {
                        await this.executeCommand(commandName, rawArgs);
                    } else {
                        this.log(`Unknown command: ${commandName}. Type 'help' for info.`, 'red');
                    }
                    break;
            }
        } catch (e: any) {
            this.log(`Error: ${e.message}`, 'red');
        }
        this.writeEmitter.fire('$ ');
    }

    private displayHelp() {
        this.log("MOTIONLINK COMMAND REFERENCE", "green");
        
        const hName = "Command".padEnd(15);
        const hIn = "Input".padEnd(35);
        const hOut = "Output";
        
        this.writeEmitter.fire(`\r\n${hName}${hIn}${hOut}\r\n${"-".repeat(85)}\r\n`);

        for (const [name, def] of Object.entries(COMMAND_DEFS)) {
            const paramsStr = def.params.length > 0 
                ? `${def.params.map(p => `${p.key}:${p.type}`).join(', ')}` 
                : "none";
            
            const outputsStr = def.outputs.length > 0 
                ? `${def.outputs.map(o => `${o.key}:${o.type}`).join(', ')}` 
                : "none";

            const line = `${name.padEnd(15)}${paramsStr.padEnd(35)}${outputsStr}\r\n`;
            this.writeEmitter.fire(line);
        }
        this.writeEmitter.fire(`\r\nCLI Utils: help, clear\r\n`);
    }

    private async executeCommand(name: string, rawArgs: string[]) {
        try {
            const result = await MotionLink.getInstance().handleCommand(name, rawArgs);
            
            if (result.success) {
                this.log(`TX [${name}]: ${result.hexSent}`, 'green');
                this.log(`RX [${result.name}]: ${result.hexReceived}`, 'green');
                
                if (result.dataStr) {
                    this.log(`Response: {${result.dataStr}}`, 'yellow');
                }
            } else {
                this.log(`Error: ${result.error}`, 'red');
                if (result.usage) {
                    this.log(`Usage: ${result.usage}`, 'yellow');
                }
            }
        } catch (e: any) {
            this.log(`Error: ${e.message}`, 'red');
        }
    }

    public createPty(): vscode.Pseudoterminal {
        return {
            onDidWrite: this.writeEmitter.event,
            open: () => this.writeEmitter.fire('\x1b[1;32m[MotionLink Console]\x1b[0m\r\n$ '),
            handleInput: (data: string) => {
                switch (data) {
                    case '\r':
                        const cmd = this.lineBuffer;
                        this.writeEmitter.fire('\r\n');
                        this.processInput(cmd);
                        this.lineBuffer = "";
                        break;
                    case '\t':
                        this.handleTabCompletion();
                        break;
                    case '\x7f':
                        if (this.lineBuffer.length > 0) {
                            this.lineBuffer = this.lineBuffer.slice(0, -1);
                            this.writeEmitter.fire('\b \b');
                        }
                        break;
                    case '\x1b[A':
                        if (this.history.length > 0) {
                            if (this.historyIndex === -1) this.historyIndex = this.history.length - 1;
                            else if (this.historyIndex > 0) this.historyIndex--;
                            this.clearCurrentLine();
                            this.lineBuffer = this.history[this.historyIndex];
                            this.writeEmitter.fire(this.lineBuffer);
                        }
                        break;
                    case '\x1b[B':
                        if (this.historyIndex !== -1) {
                            this.clearCurrentLine();
                            if (this.historyIndex < this.history.length - 1) {
                                this.historyIndex++;
                                this.lineBuffer = this.history[this.historyIndex];
                            } else {
                                this.historyIndex = -1;
                                this.lineBuffer = "";
                            }
                            this.writeEmitter.fire(this.lineBuffer);
                        }
                        break;
                    default:
                        if (data.length === 1 && data >= ' ') {
                            this.lineBuffer += data;
                            this.writeEmitter.fire(data);
                        }
                }
            },
            close: () => { this.terminal = undefined; }
        };
    }

    private handleTabCompletion() {
        const parts = this.lineBuffer.toLowerCase().split(/\s+/);
        
        // Only apply tab completion when only the command word is typed
        if (parts.length !== 1) {
            return;
        }
        
        const commandName = parts[0];
        
        // Get all matching commands
        const matchingCommands = Object.keys(COMMAND_DEFS).filter(cmd => 
            cmd.startsWith(commandName)
        );

        if (matchingCommands.length === 0) {
            // No matches, do nothing
            return;
        } else if (matchingCommands.length === 1) {
            // Single match, auto-complete
            const fullCommand = matchingCommands[0];
            
            // Clear current line and show completed command
            this.clearCurrentLine();
            this.lineBuffer = fullCommand;
            this.writeEmitter.fire(this.lineBuffer);
        } else {
            // Multiple matches, display them
            this.writeEmitter.fire('\r\n');
            const availableCommands = matchingCommands.join('  ');
            this.log(`Available commands: ${availableCommands}`, 'yellow');
            this.writeEmitter.fire(`$ ${this.lineBuffer}`);
        }
    }
}
