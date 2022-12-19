import {
    ModuleInstance,
    G1Element,
    G2Element,
} from '@chiamine/bls-signatures';
import { Inject, Injectable } from '@nestjs/common';
import { hex_to_buffer } from './util';

@Injectable()
export class Bls {
    constructor(@Inject('BLS') private readonly BLS: ModuleInstance) { }

    public signatureFromHex(hex: string): G2Element {
        return G2Element.from_bytes(hex_to_buffer(hex));
    }

    public verify(
        public_key: G1Element,
        message: string,
        signature: G2Element,
    ): boolean {
        return this.BLS.AugSchemeMPL.verify(
            public_key,
            hex_to_buffer(message),
            signature,
        );
    }

    public aggregateVerify(
        public_keys: G1Element[],
        messages: string[],
        signature: G2Element,
    ): boolean {
        return this.BLS.AugSchemeMPL.aggregate_verify(
            public_keys,
            messages.map((message) => hex_to_buffer(message)),
            signature,
        );
    }
}
