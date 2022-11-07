import { Module } from '@nestjs/common';
import { Tail } from './tail-database-client/models/tail/model';

@Module({
  imports: [],
  controllers: [],
  providers: [Tail],
  exports: [Tail],
})
export class TailDatabaseModule {}
