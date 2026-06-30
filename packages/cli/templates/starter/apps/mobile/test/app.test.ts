import assert from "node:assert/strict";
import test from "node:test";
import { HomeScreen } from "../src/screens/home/home.js";

test("mobile starter screen imports React Native and workspace packages in Node tests", () => {
  const screen = HomeScreen();
  assert.equal(typeof screen, "object");
});
