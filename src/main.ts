import { NestFactory } from '@nestjs/core';
import { TailDatabaseModule } from './tail.database.module';

async function bootstrap() {
  const app = await NestFactory.create(TailDatabaseModule);
  await app.listen(3000);
}
bootstrap();
