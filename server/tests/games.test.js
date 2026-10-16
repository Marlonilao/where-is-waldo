import request from "supertest";
import { afterEach, expect, test, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

afterEach(() => {
  vi.useRealTimers();
});

test("starting a Game records when it started on the server", async () => {
  const now = new Date("2026-10-16T12:00:00Z");
  vi.useFakeTimers({ now, toFake: ["Date"] });

  const res = await request(app).post("/games").send({ sceneId: 1 }).expect(201);

  const game = await prisma.game.findUnique({ where: { id: res.body.id } });
  expect(game.sceneId).toBe(1);
  expect(game.startedAt).toEqual(now);
  expect(game.finishedAt).toBeNull();
});

test("starting a Game returns what the player needs to play", async () => {
  const res = await request(app).post("/games").send({ sceneId: 1 }).expect(201);

  expect(res.body).toEqual({
    id: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    ),
    imageUrl: "https://example.com/test-scene.png",
    characters: [
      { id: 1, name: "Waldo" },
      { id: 2, name: "Wenda" },
    ],
  });
});

test("starting a Game never reveals Hit boxes", async () => {
  const res = await request(app).post("/games").send({ sceneId: 1 }).expect(201);

  for (const field of ["x1", "y1", "x2", "y2"]) {
    expect(res.text).not.toContain(`"${field}"`);
  }
});

test("starting a Game on an unknown Scene returns 404", async () => {
  await request(app).post("/games").send({ sceneId: 999 }).expect(404);
});
