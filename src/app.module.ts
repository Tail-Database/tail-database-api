import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TailDatabaseModule } from './tail.database.module';
import { TailController } from './tail/tail.controller';
import { TailService } from './tail/tail.service';

@Module({
  imports: [TailDatabaseModule],
  controllers: [AppController, TailController],
  providers: [AppService, TailService],
})
export class AppModule {}
