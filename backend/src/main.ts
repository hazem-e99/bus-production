import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { join, isAbsolute } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import { AppException } from './common/exceptions/app.exception';
import { ErrorCodes } from './common/exceptions/error-codes';
import { formatValidationErrors } from './common/utils/format-validation-errors';

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
      exceptionFactory: (validationErrors) => {
        const errors = formatValidationErrors(validationErrors);
        return new AppException(
          422,
          ErrorCodes.VALIDATION_ERROR,
          'Please correct the highlighted fields.',
          errors,
        );
      },
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

  const host = configService.get<string>('HOST');
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  console.log(`🚀 Bus System Backend running on http://${host || 'localhost'}:${port}`);
  console.log(`📋 API Base URL: http://${host || 'localhost'}:${port}/api`);
}
bootstrap();
