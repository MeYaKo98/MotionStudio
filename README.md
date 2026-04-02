# Motion Studio

<p align="center">
  <img src="https://raw.githubusercontent.com/MeYaKo98/MotionStudio/master/images/logo.png" width="500" alt="Motion Robotics Logo">
</p>

Motion Studio is a VS Code extension that provides comprehensive device control and communication capabilities for Motion Framework devices via TCP/IP and Serial connections.

## Features

- **Multi-Protocol Support**: Connect to devices via TCP/IP or Serial port
- **Interactive CLI**: Execute protocol commands with an interactive command-line interface
- **Device Discovery**: Automatic discovery of Motion Framework devices on the network (Bonjour/mDNS)
- **Binary Protocol Handling**: Automatic serialization/deserialization of command data
- **Multiple Data Types**: Support for float, uint8, uint16, and string data types
- **Connection Status**: Status bar indicator showing current connection state
- **Command History**: CLI maintains command history for easy reuse

## Supported Commands

The extension supports various Motion Framework protocol commands:

- **getstatus**: Get device status
- **bridgeversion**: Query bridge/device version
- **getdrive**: Get drive information
- **getposition**: Query current position (x, y, theta)
- **moveto**: Move to target position (x, y)
- **orient**: Orient to specified angle
- **stop**: Stop current motion

## Requirements

- VS Code 1.80.0 or higher
- Node.js 16.0.0 or higher (for development)

## Quick Start

1. **Connect to Device**
   - Click the "Motion Link" status bar button (bottom right)
   - Select connection type: TCP/IP or Serial
   - Choose target device or port
   - Connection status will be displayed in the status bar

2. **Open CLI**
   - Use command palette (`Ctrl+Shift+P`) and search for "Motion Studio: Open CLI"
   - Or click the "Motion Link" status bar button when connected

3. **Execute Commands**
   - Type command name followed by arguments (if required)
   - Example: `moveto 10.5 20.3`
   - Use `help` to see all available commands
   - Use `clear` to clear the console

## Extension Settings

This extension contributes the following VS Code features:

- **Commands**:
  - `motion-studio.connect`: Connect to Motion Framework device
  - `motion-studio.disconnect`: Disconnect from device
  - `motion-studio.open-cli`: Open the MotionLink CLI terminal

- **Terminal Profile**: "motion-studio.cli" - Launches the MotionLink CLI terminal profile

- **Context Variables**:
  - `motion-studio.isConnected`: Boolean indicating current connection state

## Known Issues

- TCP/IP discovery (Bonjour) requires proper network configuration

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.
