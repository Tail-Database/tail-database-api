import { OPERATOR_LOOKUP, run_program, SExp } from 'clvm';
import { go, setPrintFunction } from 'clvm_tools';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
    Coin,
    InsertResponse,
    Tail,
    TailRecord,
    coin_name,
    hash_program,
    hex_to_program,
    match_cat_puzzle,
    AGG_SIG_ME,
    COIN_CREATE_CONDITION,
    MAGIC_SPEND
} from '@tail-database/tail-database-client';
import { getCurrentHour, sha256 } from 'src/util';
import { Bls } from 'src/bls';

@Injectable()
export class TailService {
    constructor(private readonly coin: Coin, private readonly tail: Tail, private readonly bls: Bls) { }

    async getTails(): Promise<TailRecord[]> {
        return this.tail.all();
    }

    async getTail(hash: string): Promise<TailRecord> {
        return this.tail.get(hash);
    }

    async addTail(tailRecord: TailRecord): Promise<InsertResponse> {
        return this.tail.insert(tailRecord);
    }

    async addTails(tailRecords: TailRecord[]): Promise<InsertResponse> {
        const hashes = new Map<string, boolean>();
        const codes = new Map<string, boolean>();

        for (const tailRecord of tailRecords) {
            if (hashes.get(tailRecord.hash)) {
                throw new BadRequestException('Duplicate hash in batch insert');
            }
            if (codes.get(tailRecord.code)) {
                throw new BadRequestException('Duplicate hash in batch insert');
            }
            hashes.set(tailRecord.hash, true);
            codes.set(tailRecord.code, true);
        }

        return this.tail.batch_insert(tailRecords);
    }

    async getTailEveCoinAddress(hash: string): Promise<string> {
        const tail = await this.tail.get(hash);
        const eve_coin = await this.coin.get_coin_record_by_name(tail.eveCoinId);

        return eve_coin.coin_record.coin.puzzle_hash;
    }

    public async authorize(hash: string, request_signature: string): Promise<boolean> {
        const auth_message = this.getAuthorizationMessage();
        const signature = this.bls.signatureFromHex(request_signature);

        const [eve_coin_id, eve_coin_spent_block_index] = await this.getTailReveal(hash);
        const { coin_solution } = await this.coin.get_puzzle_and_solution(eve_coin_id, eve_coin_spent_block_index)

        const [, result] = run_program(
            hex_to_program(coin_solution.puzzle_reveal),
            hex_to_program(coin_solution.solution),
            OPERATOR_LOOKUP,
        );

        for (const data of result.as_iter()) {
            const opcode = (data as SExp).first();

            if (opcode.as_int() == AGG_SIG_ME) {
                const synthetic_pk_sexp: SExp = data.rest().first();
                const synthetic_pk_hex = synthetic_pk_sexp.as_javascript().toString();
                const synthetic_pk = this.bls.getPublicKey(synthetic_pk_hex);

                return this.bls.verify(synthetic_pk, auth_message, signature)
            }
        }

        return false;
    }

    private getAuthorizationMessage(): string {
        return sha256(getCurrentHour().toISOString());
    }

    async getTailReveal(eveCoinId: string): Promise<[string, number, string, string]> {
        let current_coin = eveCoinId;

        while (true) {
            const coin = await this.coin.get_coin_record_by_name(current_coin);

            if (!coin.success || !coin.coin_record) {
                throw new Error(`Could not find coin id ${current_coin}`);
            }

            const parent_coin_info = coin.coin_record.coin.parent_coin_info;
            const parent = await this.coin.get_puzzle_and_solution(parent_coin_info, coin.coin_record.confirmed_block_index);

            if (!parent.coin_solution) {
                throw new Error(`Could not find parent spend ${parent_coin_info} at height ${coin.coin_record.confirmed_block_index}`);
            }

            const puzzle = hex_to_program(parent.coin_solution.puzzle_reveal);
            const match = match_cat_puzzle(puzzle);

            // First parent that is not a CAT
            if (!match) {
                const children = await this.coin.get_coin_records_by_parent_ids([parent_coin_info]);

                for (const child of children.coin_records) {
                    const child_coin_name = coin_name(String(child.coin.amount), child.coin.parent_coin_info, child.coin.puzzle_hash);
                    const child_reveal = await this.coin.get_puzzle_and_solution(child_coin_name, child.spent_block_index);

                    if (!child_reveal.success) {
                        // This coin hasn't been spent but there may be another child that has
                        continue;
                    }

                    const puzzle = hex_to_program(child_reveal.coin_solution.puzzle_reveal);
                    const match = match_cat_puzzle(puzzle);

                    // First CAT
                    if (match) {
                        const [, , inner_puzzle] = match;
                        const outer_solution = hex_to_program(child_reveal.coin_solution.solution);
                        const inner_solution = (outer_solution.as_iter().next().value as SExp);
                        const inner_puzzle_program = hex_to_program(inner_puzzle);

                        const [, result] = run_program(
                            inner_puzzle_program,
                            inner_solution,
                            OPERATOR_LOOKUP,
                        );

                        for (const data of result.as_iter()) {
                            const opcode = (data as SExp).first();

                            if (opcode.as_int() == COIN_CREATE_CONDITION) {
                                const puzzle_hash = data.rest().first();

                                if (puzzle_hash.equal_to(SExp.to([]))) {
                                    const amount = data.rest().rest().first();

                                    if (amount.as_int() == MAGIC_SPEND) {
                                        const tail: SExp = data.rest().rest().rest().first();
                                        const hashed_tail_reveal = hash_program(tail);
                                        const tail_reveal: string = await new Promise(resolve => {
                                            setPrintFunction(disassembled_clvm => resolve(disassembled_clvm));
                                            go('opd', tail.toString());
                                        });

                                        return [child_coin_name.slice(2), child.spent_block_index, hashed_tail_reveal, tail_reveal];
                                    }
                                }
                            }
                        }
                    }
                }
            }

            current_coin = parent_coin_info;
        }
    }
}
