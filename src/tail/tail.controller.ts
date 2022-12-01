import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InsertResponse, TailRecord } from '@tail-database/tail-database-client';
import { AddTailDto } from './add.tail.dto';
import { AddTailsDto } from './add.tails.dto';
import { TailService } from './tail.service';

interface TailRevealResponse {
    eve_coin_id: string;
    tail_hash: string;
    tail_reveal: string;
}

@Controller('tail')
export class TailController {
  constructor(private readonly tailService: TailService) {}

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
    return this.tailService.addTail(addTailDto);
  }

  @Post('/batch/insert')
  async addTails(@Body() addTailsDto: AddTailsDto): Promise<InsertResponse> {
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
}
