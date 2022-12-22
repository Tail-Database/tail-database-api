import { h, OPERATOR_LOOKUP, run_program, SExp, sexp_from_stream, Stream, to_sexp_f } from 'clvm';
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
import { Bls } from 'src/bls';
import { AuthService } from 'src/auth/auth.service';

const stream = new Stream(h('ff02ffff01ff02ff02ffff04ff02ffff04ff05ff80808080ffff04ffff01ff02ffff03ffff07ff0580ffff01ff0bffff0102ffff02ff02ffff04ff02ffff04ff09ff80808080ffff02ff02ffff04ff02ffff04ff0dff8080808080ffff01ff0bffff0101ff058080ff0180ff018080'));

stream.seek = 0;

const SHA256TREE = sexp_from_stream(stream, to_sexp_f)

@Injectable()
export class TailService {
    constructor(private readonly coin: Coin, private readonly tail: Tail, private readonly bls: Bls, private readonly authService: AuthService) { }

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

    public async getParentPuzzleHash(coinId: string): Promise<string> {
        const eve_coin = await this.coin.get_coin_record_by_name(coinId);
        const eve_coin_parent = await this.coin.get_coin_record_by_name(eve_coin.coin_record.coin.parent_coin_info);

        return eve_coin_parent.coin_record.coin.puzzle_hash;
    }

    public async authorize(hash: string, eveCoinId: string, request_signature: string): Promise<boolean> {
        if (!request_signature) {
            throw new BadRequestException('Signature is required');
        }

        // Eve coin must be of the correct CAT
        await this.validateTailHash(hash, eveCoinId);

        const auth_message = SExp.to("Chia Signed Message").cons(this.authService.getAuthorizationMessage());

        const [, hash_result] = run_program(
            SHA256TREE,
            SExp.to([auth_message]),
            OPERATOR_LOOKUP,
        );
        const message = hash_result.atom.hex();

        const signature = this.bls.signatureFromHex(request_signature);
        const eve_coin = await this.coin.get_coin_record_by_name(eveCoinId);

        // Puzzle and solution of the parent of eve coin
        const { coin_solution } = await this.coin.get_puzzle_and_solution(eve_coin.coin_record.coin.parent_coin_info, eve_coin.coin_record.confirmed_block_index);

        const [, result] = run_program(
            hex_to_program(coin_solution.puzzle_reveal),
            hex_to_program(coin_solution.solution),
            OPERATOR_LOOKUP,
        );

        for (const data of result.as_iter()) {
            const opcode = (data as SExp).first();

            if (opcode.as_int() == AGG_SIG_ME) {
                const synthetic_pk_sexp: SExp = data.rest().first();
                const synthetic_pk_hex = synthetic_pk_sexp.atom.hex();
                const synthetic_pk = this.bls.getPublicKey(synthetic_pk_hex);

                // Verify signature against key of parent of eve
                const valid = this.bls.verify(synthetic_pk, message, signature);

                if (valid) {
                    return;
                }
            }
        }

        throw new BadRequestException('Invalid signature');
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

    public async validateTailHash(hash, eveCoinId) {
        const [eve_coin_id, _, tail_hash] = await this.getTailReveal(eveCoinId);

        if (tail_hash !== hash) {
            throw new BadRequestException(`eveCoinId is not for correct CAT. Expected TAIL hash of ${hash} but found ${tail_hash}`);
        }

        return eve_coin_id;
    }
}
