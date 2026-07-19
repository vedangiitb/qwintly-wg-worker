import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@nestjs/config";
import type { Express } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.disable("x-powered-by");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port") || 8080;

  await app.listen(port);
  console.log(`Worker running on ${port}`);
}
await bootstrap();
