import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

// Reference NestJS bootstrap for the @vibe-engineer-starter/api app (DL-16).
// No-auth default (DL-16 §7); local development only.
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.API_PORT ? Number(process.env.API_PORT) : 3000);
}
