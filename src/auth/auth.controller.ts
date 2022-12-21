import { Controller, Get, Logger, Param } from '@nestjs/common';
import { convertbits, encode } from 'src/bech32';
import { TailService } from '../tail/tail.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tailService: TailService,
  ) { }

  @Get(':hash')
  async getMessage(@Param('hash') hash: string): Promise<{ address: string; message: string; }> {
    this.logger.log('GET /auth called');

    const message = this.authService.getAuthorizationMessage();
    const puzzle_hash = await this.tailService.getEveCoinParentAddress(hash);
    const puzzlehashBuffer = Buffer.from(puzzle_hash.slice(2), 'hex');
    const puzzlehashArray = Array.prototype.slice.call(puzzlehashBuffer, 0);
    const data = convertbits(puzzlehashArray, 8, 5);
    const address = encode('xch', data, 'bech32m');

    return {
        address,
        message
    };
  }
}
