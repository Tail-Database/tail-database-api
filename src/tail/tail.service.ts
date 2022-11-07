import { Injectable } from '@nestjs/common';
import { InsertResponse, Tail, TailRecord } from '../tail-database-client';

@Injectable()
export class TailService {
    constructor(private readonly tail: Tail) {}

    async getTails(): Promise<TailRecord[]> {
        return this.tail.all();
    }

    async getTail(hash: string): Promise<TailRecord> {
        return this.tail.get(hash);
    }

    async addTail(tailRecord: TailRecord): Promise<InsertResponse> {
        return this.tail.insert(tailRecord);
    }
}
