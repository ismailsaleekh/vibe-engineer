import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module.js";
import { bootstrap } from "../src/main.js";

test("api exposes bootstrap and AppModule", () => {
  assert.equal(typeof bootstrap, "function");
  assert.equal(typeof AppModule, "function");
});

test("api sample route resolves through Nest DI in the tsx dev runtime", async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);

  try {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/golden-records`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  } finally {
    await app.close();
  }
});
