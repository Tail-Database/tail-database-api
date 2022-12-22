import { Body, Controller, Logger, Param, Post } from '@nestjs/common';
import { convertbits, encode } from 'src/bech32';
import { TailService } from '../tail/tail.service';
import { AuthDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tailService: TailService,
  ) { }

  @Post(':hash')
  async getMessage(@Param('hash') hash: string, @Body() authDto: AuthDto): Promise<{ address: string; message: string; }> {
    this.logger.log('GET /auth called');

    await this.tailService.validateTailHash(hash, authDto.coinId);

    const message = this.authService.getAuthorizationMessage();
    const [eve_coin_id] = await this.tailService.getTailReveal(authDto.coinId);
    const eve_coin_parent_puzzle_hash = await this.tailService.getParentPuzzleHash(eve_coin_id);
    const eve_coin_parent_puzzle_hash_buffer = Buffer.from(eve_coin_parent_puzzle_hash.slice(2), 'hex');
    const eve_coin_parent_puzzle_hash_array = Array.prototype.slice.call(eve_coin_parent_puzzle_hash_buffer, 0);
    const address = encode('xch', convertbits(eve_coin_parent_puzzle_hash_array, 8, 5), 'bech32m');

    return {
        address,
        message
    };
  }
}
