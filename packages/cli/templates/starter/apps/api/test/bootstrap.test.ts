import assert from "node:assert/strict";
import test from "node:test";
import { AppModule } from "../src/app.module.js";
import { bootstrap } from "../src/main.js";

test("api exposes bootstrap and AppModule", () => {
  assert.equal(typeof bootstrap, "function");
  assert.equal(typeof AppModule, "function");
});
