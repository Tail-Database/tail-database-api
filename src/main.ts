import { NestFactory } from '@nestjs/core';
import { TailDatabaseModule } from './tail.database.module';

async function bootstrap() {
  const app = await NestFactory.create(TailDatabaseModule);

  app.enableCors({ origin: '*' });

  await app.listen(8080);
}
bootstrap();
