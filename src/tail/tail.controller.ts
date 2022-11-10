import { Body, Controller, Get, Param } from '@nestjs/common';
import { InsertResponse, TailRecord } from '@tail-database/tail-database-client';
import { AddTailDto } from './add.tail.dto';
import { TailService } from './tail.service';

interface TailRevealResponse {
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

  @Get()
  async addTail(@Body() addTailDto: AddTailDto): Promise<InsertResponse> {
    return this.tailService.addTail(addTailDto);
  }

  @Get('/reveal/:eveCoinId')
  async getTailReveal(@Param('eveCoinId') eveCoinId: string): Promise<TailRevealResponse> {
    const [_, tail_hash, tail_reveal] = await this.tailService.getTailReveal(eveCoinId);

    return {
        tail_hash,
        tail_reveal
    };
  }
}
