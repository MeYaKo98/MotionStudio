// --- 1. TYPE SYSTEM & HANDLERS ---
export type SchemaType = 'float' | 'uint8' | 'uint16' | 'string';

export interface Field {
    key: string;
    type: SchemaType;
}

export interface ReadResult<T> {
    value: T;
    offset: number;
}

export interface TypeHandler<T> {
    size: (value: T) => number;
    write: (buffer: Buffer, offset: number, value: T) => number;
    read: (buffer: Buffer, offset: number) => ReadResult<T>;
    validate: (value: string) => T | null;
}

export const Handlers: Record<SchemaType, TypeHandler<any>> = {
    float: {
        size: () => 4,
        write: (buf, off, val) => { buf.writeFloatLE(val, off); return off + 4; },
        read: (buf, off) => ({ value: buf.readFloatLE(off), offset: off + 4 }),
        validate: (value: string) => {
            // Normalize: accept both . and , as decimal separators
            const normalized = value.replace(',', '.');
            const floatVal = parseFloat(normalized);
            return isNaN(floatVal) ? null : floatVal;
        }
    },
    uint8: {
        size: () => 1,
        write: (buf, off, val) => { buf.writeUInt8(val, off); return off + 1; },
        read: (buf, off) => ({ value: buf.readUInt8(off), offset: off + 1 }),
        validate: (value: string) => {
            const uint8Val = parseInt(value, 10);
            return (isNaN(uint8Val) || uint8Val < 0 || uint8Val > 255) ? null : uint8Val;
        }
    },
    uint16: {
        size: () => 2,
        write: (buf, off, val) => { buf.writeUInt16LE(val, off); return off + 2; },
        read: (buf, off) => ({ value: buf.readUInt16LE(off), offset: off + 2 }),
        validate: (value: string) => {
            const uint16Val = parseInt(value, 10);
            return (isNaN(uint16Val) || uint16Val < 0 || uint16Val > 65535) ? null : uint16Val;
        }
    },
    string: {
        size: (val: string) => Buffer.byteLength(val, 'utf8') + 1,
        write: (buf, off, val: string) => {
            const bytes = buf.write(val, off, 'utf8');
            buf.writeUInt8(0, off + bytes);
            return off + bytes + 1;
        },
        read: (buf, off) => {
            let end = off;
            while (end < buf.length && buf[end] !== 0) end++;
            return { value: buf.toString('utf8', off, end), offset: end + 1 };
        },
        validate: (value: string) => value
    }
};

export interface CommandDef {
    code: number;
    params: Field[];
    outputs: Field[];
}

export const COMMAND_DEFS: Record<string, CommandDef> = {
    getstatus:     { code: 0x0000, params: [], outputs: [] },
    bridgeversion: { code: 0x0001, params: [], outputs: [{ key: 'version', type: 'string' }] },
    getdrive:      { code: 0x0020, params: [], outputs: [{ key: 'id', type: 'uint8' }] },
    getposition:   { 
        code: 0x0021, 
        params: [], 
        outputs: [
            { key: 'x', type: 'float' }, 
            { key: 'y', type: 'float' }, 
            { key: 'theta', type: 'float' }
        ] 
    },
    moveto: { 
        code: 0x0022, 
        params: [
            { key: 'x', type: 'float' }, 
            { key: 'y', type: 'float' },
        ], 
        outputs: [] 
    },
    orient: { code: 0x0023, params: [{ key: 'orientation', type: 'float' }], outputs: [] },
    move: { code: 0x0024, params: [{ key: 'distance', type: 'float' }], outputs: [] },
    turn: { code: 0x0025, params: [{ key: 'angle', type: 'float' }], outputs: [] },
    stop:   { code: 0x0026, params: [], outputs: [] }
};

export const CODE_TO_NAME = Object.fromEntries(
    Object.entries(COMMAND_DEFS).map(([name, def]) => [def.code, name])
);
