import request from "supertest";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

// Test Scene Hit boxes (see setup.js): Waldo (id 1) spans 0.1–0.2 on both axes.
let gameId;

beforeEach(async () => {
  const res = await request(app).post("/games").send({ sceneId: 1 });
  gameId = res.body.id;
});

afterEach(() => {
  vi.useRealTimers();
});

function guess(body, id = gameId) {
  return request(app).post(`/games/${id}/guesses`).send(body);
}

const waldoHitBox = { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 };
const wendaHitBox = { x1: 0.5, y1: 0.5, x2: 0.6, y2: 0.7 };

function foundCharacterIds() {
  return prisma.foundCharacter
    .findMany({ where: { gameId }, orderBy: { characterId: "asc" } })
    .then((rows) => rows.map((row) => row.characterId));
}

test("a Guess inside the Character's Hit box is correct", async () => {
  const res = await guess({ characterId: 1, x: 0.15, y: 0.15 }).expect(200);

  expect(res.body).toEqual({
    correct: true,
    hitBox: waldoHitBox,
    finished: false,
  });
});

test("a correct Guess records the Character as found", async () => {
  await guess({ characterId: 1, x: 0.15, y: 0.15 }).expect(200);

  expect(await foundCharacterIds()).toEqual([1]);
});

test("a repeat correct Guess returns the Hit box and writes nothing", async () => {
  await guess({ characterId: 1, x: 0.15, y: 0.15 }).expect(200);
  const res = await guess({ characterId: 1, x: 0.12, y: 0.18 }).expect(200);

  expect(res.body).toEqual({
    correct: true,
    hitBox: waldoHitBox,
    finished: false,
  });
  expect(await foundCharacterIds()).toEqual([1]);
});

test("a correct Guess returns only the guessed Character's Hit box", async () => {
  await guess({ characterId: 1, x: 0.15, y: 0.15 }).expect(200);
  const res = await guess({ characterId: 2, x: 0.55, y: 0.6 }).expect(200);

  expect(res.body).toEqual({
    correct: true,
    hitBox: wendaHitBox,
    finished: true,
    timeMs: expect.any(Number),
  });
  expect(await foundCharacterIds()).toEqual([1, 2]);
});

test("a Guess outside the Character's Hit box is wrong", async () => {
  const res = await guess({ characterId: 1, x: 0.55, y: 0.6 }).expect(200);

  expect(res.body).toEqual({ correct: false });
  expect(await foundCharacterIds()).toEqual([]);
});

test.each([
  ["top-left corner", 0.1, 0.1],
  ["bottom-right corner", 0.2, 0.2],
  ["left edge", 0.1, 0.15],
  ["bottom edge", 0.15, 0.2],
])("a Guess exactly on the Hit box's %s is correct", async (_, x, y) => {
  const res = await guess({ characterId: 1, x, y }).expect(200);

  expect(res.body).toEqual({
    correct: true,
    hitBox: waldoHitBox,
    finished: false,
  });
});

test("a Guess for an unknown Game returns 404", async () => {
  await guess(
    { characterId: 1, x: 0.15, y: 0.15 },
    "00000000-0000-0000-0000-000000000000",
  ).expect(404);
});

test.each([
  ["an unknown Character", 999],
  ["a missing Character", undefined],
  ["a non-numeric Character", "1"],
])("a Guess for %s returns 400", async (_, characterId) => {
  await guess({ characterId, x: 0.15, y: 0.15 }).expect(400);
});

test("a Guess for a Character from another Scene returns 400", async () => {
  const otherScene = await prisma.scene.create({
    data: {
      name: "Other Scene",
      imageUrl: "https://example.com/other-scene.png",
      characters: {
        create: [{ name: "Odlaw", imageUrl: "https://example.com/odlaw.png", x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }],
      },
    },
    include: { characters: true },
  });

  const characterId = otherScene.characters[0].id;
  await guess({ characterId, x: 0.15, y: 0.15 }).expect(400);
});

test.each([
  ["a missing x", { y: 0.15 }],
  ["a missing y", { x: 0.15 }],
  ["x below 0", { x: -0.01, y: 0.15 }],
  ["x above 1", { x: 1.01, y: 0.15 }],
  ["y below 0", { x: 0.15, y: -0.01 }],
  ["y above 1", { x: 0.15, y: 1.01 }],
  ["a non-numeric x", { x: "0.15", y: 0.15 }],
  ["a null y", { x: 0.15, y: null }],
])("a Guess with %s returns 400", async (_, point) => {
  await guess({ characterId: 1, ...point }).expect(400);
});

test("a Guess with no body returns 400", async () => {
  await request(app).post(`/games/${gameId}/guesses`).expect(400);
});

function finishedAt() {
  return prisma.game
    .findUnique({ where: { id: gameId } })
    .then((game) => game.finishedAt);
}

async function finishGame() {
  await guess({ characterId: 1, x: 0.15, y: 0.15 }).expect(200);
  return guess({ characterId: 2, x: 0.55, y: 0.6 }).expect(200);
}

test("the Guess that finds the last Character finishes the Game with its time", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-18T12:00:00.000Z"));
  await prisma.game.update({
    where: { id: gameId },
    data: { startedAt: new Date("2026-10-18T11:58:45.250Z") },
  });

  const res = await finishGame();

  expect(res.body).toEqual({
    correct: true,
    hitBox: wendaHitBox,
    finished: true,
    timeMs: 74750,
  });
  expect(await finishedAt()).toEqual(new Date("2026-10-18T12:00:00.000Z"));
});

test.each([
  ["a correct Guess", { characterId: 1, x: 0.15, y: 0.15 }],
  ["a wrong Guess", { characterId: 1, x: 0.55, y: 0.6 }],
  ["an invalid Guess", { characterId: 999, x: 0.15, y: 0.15 }],
])("%s on a finished Game returns 409 and keeps finishedAt", async (_, body) => {
  await finishGame();
  const finishedAtBefore = await finishedAt();

  await guess(body).expect(409);

  expect(await finishedAt()).toEqual(finishedAtBefore);
});
