import { execSync } from "node:child_process";
import { expect, test } from "vitest";
import { prisma } from "../src/db.js";

test("the seed adds nothing when a Scene already exists", async () => {
  execSync("node prisma/seed.js");

  expect(await prisma.scene.count()).toBe(1);
});
