import { Body, Controller, Get, Param } from '@nestjs/common';
import { InsertResponse, TailRecord } from '../tail-database-client';
import { AddTailDto } from './add.tail.dto';
import { TailService } from './tail.service';

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
}
