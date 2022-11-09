import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TailDatabaseModule } from './tail.database.module';

@Module({
  imports: [TailDatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
