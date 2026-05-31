import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { join, isAbsolute } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 7126);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const configuredOrigins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = Array.from(new Set([...configuredOrigins, 'http://localhost:3000', 'http://localhost:3001']));

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'Pragma'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    }),
  );

  const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
  const resolvedUploadDir = isAbsolute(uploadDir)
    ? uploadDir
    : join(process.cwd(), uploadDir);

  if (!fs.existsSync(resolvedUploadDir)) {
    fs.mkdirSync(resolvedUploadDir, { recursive: true });
  }
  app.useStaticAssets(resolvedUploadDir, { prefix: '/uploads/' });

  await app.listen(port);
  console.log(`🚀 Bus System Backend running on http://localhost:${port}`);
  console.log(`📋 API Base URL: http://localhost:${port}/api`);
}
bootstrap();
