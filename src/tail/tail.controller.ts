import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Logger, Patch } from '@nestjs/common';
import { InsertResponse, TailRecord, validateTailRecord } from '@tail-database/tail-database-client';
import { AddTailDto } from './add.tail.dto';
import { AddTailsDto } from './add.tails.dto';
import { TailService } from './tail.service';
import { NftService } from '../nft/nft.service';

interface TailRevealResponse {
  eve_coin_id: string;
  eve_coin_spent_block_index: number;
  tail_hash: string;
  tail_reveal: string;
}

@Controller('tail')
export class TailController {
  private readonly logger = new Logger(TailController.name);

  constructor(
    private readonly tailService: TailService,
    private readonly nftService: NftService,
  ) { }

  @Get()
  async getTails(): Promise<TailRecord[]> {
    this.logger.log('GET /tail called');

    return this.tailService.getTails();
  }

  @Get(':hash')
  async getTail(@Param('hash') hash: string): Promise<TailRecord> {
    this.logger.log(`GET /tail/${hash} called`);

    return this.tailService.getTail(hash);
  }

  @Post()
  async addTail(@Headers() headers, @Body() addTailDto: AddTailDto): Promise<InsertResponse> {
    this.logger.log('POST /tail called');

    await this.tailService.authorize(addTailDto.hash, addTailDto.eveCoinId, headers['x-chia-signature']);

    const eveCoinId = await this.validateTailRecord(addTailDto);

    this.logger.log('Validation passed');

    return this.tailService.addTail({
      ...addTailDto,
      eveCoinId
    });
  }

  @Patch()
  async updateTail(@Headers() headers, @Body() updateTailDto: AddTailDto): Promise<InsertResponse> {
    this.logger.log('PATCH /tail called');

    await this.tailService.authorize(updateTailDto.hash, updateTailDto.eveCoinId, headers['x-chia-signature']);

    await this.validateTailRecord(updateTailDto);

    this.logger.log('Validation passed');

    return this.tailService.updateTail(updateTailDto);
  }

  @Post('/batch/insert')
  async addTails(@Headers() headers, @Body() addTailsDto: AddTailsDto): Promise<InsertResponse> {
    this.logger.log('POST /batch/insert called');

    for (const tailRecord of addTailsDto.tails) {
      await this.tailService.authorize(tailRecord.hash, tailRecord.eveCoinId, headers['x-chia-signature']);

      await this.validateTailRecord(tailRecord);
    }

    return this.tailService.addTails(addTailsDto.tails);
  }

  @Get('/reveal/:eveCoinId')
  async getTailReveal(@Param('eveCoinId') eveCoinId: string): Promise<TailRevealResponse> {
    this.logger.log(`GET /reveal/${eveCoinId} called`);

    const [eve_coin_id, eve_coin_spent_block_index, tail_hash, tail_reveal] = await this.tailService.getTailReveal(eveCoinId);

    return {
      eve_coin_id,
      eve_coin_spent_block_index,
      tail_hash,
      tail_reveal
    };
  }

  private async validateTailRecord(tailRecord: TailRecord) {
    try {
      validateTailRecord(tailRecord);
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    // Eve coin must be of the correct CAT
    const eve_coin_id = this.tailService.validateTailHash(tailRecord.hash, tailRecord.eveCoinId);

    const nftUri = await this.nftService.getNftUri(tailRecord.launcherId);

    if (!nftUri) {
      throw new BadRequestException('Launcher ID does not resolve to an NFT URI');
    }

    return eve_coin_id;
  }
}
