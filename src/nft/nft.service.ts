import { SExp } from 'clvm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { coin_name } from '../tail-database-client/coin/coin_name';
import { Coin } from '../tail-database-client/coin/rpc/coin';
import { hex_to_program, uncurry } from '../tail-database-client/clvm';
import { NFT_STATE_LAYER_MOD, SINGLETON_MOD } from '../tail-database-client';

@Injectable()
export class NftService {
    constructor(private readonly coin: Coin) {}

    async getNftUri(launcherId: string): Promise<string> {
        const { success, coin_records } = await this.coin.get_coin_records_by_parent_ids([launcherId]);
        
        if (!success || !coin_records || coin_records.length < 1) {
            throw new NotFoundException('NFT not found');
        }

        const result = await this.coin.get_puzzle_and_solution(coin_name(String(coin_records[0].coin.amount), coin_records[0].coin.parent_coin_info, coin_records[0].coin.puzzle_hash), coin_records[0].spent_block_index);
        const outer_puzzle = hex_to_program(result.coin_solution.puzzle_reveal);
        const outer_puzzle_uncurry = uncurry(outer_puzzle);

        if (outer_puzzle_uncurry) {
            const [mod, curried_args] = outer_puzzle_uncurry;

            if (mod == SINGLETON_MOD) {
                const [_, singleton_inner_puzzle] = curried_args;

                const singleton_inner_puzzle_1 = hex_to_program(singleton_inner_puzzle);
                const singleton_inner_puzzle_1_uncurry = uncurry(singleton_inner_puzzle_1);

                if (singleton_inner_puzzle_1_uncurry) {
                    const [mod, curried_args] = singleton_inner_puzzle_1_uncurry;

                    if (mod == NFT_STATE_LAYER_MOD) {
                        const [_, metadata] = curried_args;

                        const metadata_program = hex_to_program(metadata);

                        for (const data of metadata_program.as_iter()) {
                            const pair = data.as_pair();

                            if (pair) {
                                const [type, value]: SExp[] = pair;

                                if (type.atom?.decode() == 'u') {
                                    if (value.pair) {
                                        // URI
                                        return value.pair[0].atom.decode();
                                    }
                                }
                            }
                        }
                    }

                }

            }
        }

        return null;
    }
}
