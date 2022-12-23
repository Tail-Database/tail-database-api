import crypto from 'crypto';

export const getCurrentHour = (): Date => {
    const now = new Date();

    now.setMinutes(0, 0, 0);

    return now;
};

export const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

export const strip_hex_prefix = (str: string) =>
    str.startsWith('0x') ? str.slice(2) : str;

export const hex_to_buffer = (hex: string) =>
    Buffer.from(strip_hex_prefix(hex), 'hex');
