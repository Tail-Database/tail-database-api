import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InsertResponse, TailRecord, validateTailRecord } from '@tail-database/tail-database-client';
import { AddTailDto } from './add.tail.dto';
import { AddTailsDto } from './add.tails.dto';
import { TailService } from './tail.service';
import { NftService } from '../nft/nft.service';

interface TailRevealResponse {
  eve_coin_id: string;
  tail_hash: string;
  tail_reveal: string;
}

@Controller('tail')
export class TailController {
  constructor(private readonly tailService: TailService, private readonly nftService: NftService) { }

  @Get()
  async getTails(): Promise<TailRecord[]> {
    return this.tailService.getTails();
  }

  @Get(':hash')
  async getTail(@Param('hash') hash: string): Promise<TailRecord> {
    return this.tailService.getTail(hash);
  }

  @Post()
  async addTail(@Body() addTailDto: AddTailDto): Promise<InsertResponse> {
    await this.validateTailRecord(addTailDto);

    return this.tailService.addTail(addTailDto);
  }

  @Post('/batch/insert')
  async addTails(@Body() addTailsDto: AddTailsDto): Promise<InsertResponse> {
    for (const tailRecord of addTailsDto.tails) {
      await this.validateTailRecord(tailRecord);
    }

    return this.tailService.addTails(addTailsDto.tails);
  }

  @Get('/reveal/:eveCoinId')
  async getTailReveal(@Param('eveCoinId') eveCoinId: string): Promise<TailRevealResponse> {
    const [eve_coin_id, tail_hash, tail_reveal] = await this.tailService.getTailReveal(eveCoinId);

    return {
      eve_coin_id,
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

    const [_, tail_hash] = await this.tailService.getTailReveal(tailRecord.eveCoinId);

    if (tail_hash !== tailRecord.hash) {
      throw new BadRequestException(`eveCoinId is not for correct CAT. Expected TAIL hash of ${tailRecord.hash} but found ${tail_hash}`);
    }

    const nftUri = await this.nftService.getNftUri(tailRecord.launcherId);

    if (!nftUri) {
      throw new BadRequestException('Launcher ID does not resolve to an NFT URI');
    }
  }
}
