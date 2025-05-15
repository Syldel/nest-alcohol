import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as crypto from 'crypto';

// Injecte globalement l'objet crypto pour que NestJS Schedule puisse l'utiliser
(global as any).crypto = crypto;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // INFO: Avec origin: '*', il faut normalement mettre => credentials: false
  let origin: string | string[];
  if (isProduction) {
    origin = process.env.ALLOWED_ORIGINS.split(',');
  } else {
    origin = ['http://localhost:3000', 'http://localhost:3001'];
  }

  app.enableCors({
    origin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
