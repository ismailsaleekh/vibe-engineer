import { pathToFileURL } from "node:url";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

// Reference NestJS bootstrap for the @vibe-engineer-starter/api app (DL-16).
// No-auth default (DL-16 §7); local development only.
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const apiPortRaw = process.env["API_PORT"];
  await app.listen(apiPortRaw === undefined ? 3000 : Number(apiPortRaw));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void bootstrap();
}
