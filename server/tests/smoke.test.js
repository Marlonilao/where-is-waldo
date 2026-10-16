import request from "supertest";
import { expect, test } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

test("the app answers a request", async () => {
  await request(app).get("/no-such-route").expect(404);
});

test("the seeded Scene can be read", async () => {
  const scene = await prisma.scene.findFirst({ include: { characters: true } });

  expect(scene.name).toBe("Test Scene");
  expect(scene.characters.map((c) => c.name)).toEqual(["Waldo", "Wenda"]);
});
