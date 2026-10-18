import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

let gameId;

beforeEach(async () => {
  const res = await request(app).post("/games").send({ sceneId: 1 });
  gameId = res.body.id;
});

function finishGame() {
  return prisma.game.update({
    where: { id: gameId },
    data: { finishedAt: new Date() },
  });
}

function nameGame(name, id = gameId) {
  return request(app).put(`/games/${id}/name`).send({ name });
}

async function playerName() {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  return game.playerName;
}

test("naming a finished Game saves the trimmed name", async () => {
  await finishGame();

  await nameGame("  Marlon  ").expect(204);

  expect(await playerName()).toBe("Marlon");
});

test.each([
  ["1 character", "a"],
  ["20 characters", "a".repeat(20)],
  ["20 characters after trimming", ` ${"a".repeat(20)} `],
])("a name of %s is accepted", async (_, name) => {
  await finishGame();

  await nameGame(name).expect(204);

  expect(await playerName()).toBe(name.trim());
});

test.each([
  ["empty", ""],
  ["only spaces", "   "],
  ["longer than 20 characters", "a".repeat(21)],
  ["not a string", 42],
  ["missing", undefined],
])("a name that is %s returns 400", async (_, name) => {
  await finishGame();

  await nameGame(name).expect(400);

  expect(await playerName()).toBeNull();
});

test("naming an unfinished Game returns 409", async () => {
  await nameGame("Marlon").expect(409);

  expect(await playerName()).toBeNull();
});

test("naming a Game that already has a name returns 409", async () => {
  await finishGame();
  await nameGame("Marlon").expect(204);

  await nameGame("Someone else").expect(409);

  expect(await playerName()).toBe("Marlon");
});

test("naming an unknown Game returns 404", async () => {
  await nameGame("Marlon", "00000000-0000-0000-0000-000000000000").expect(404);
});
