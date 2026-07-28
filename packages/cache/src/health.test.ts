import { afterEach, expect, test } from "bun:test";
import { checkHealth } from "./health";
import { closeSharedRedisClient } from "./shared-redis";

afterEach(() => {
  closeSharedRedisClient();
});

test("health check waits for the initial Redis connection", async () => {
  await expect(checkHealth()).resolves.toBeUndefined();
});
