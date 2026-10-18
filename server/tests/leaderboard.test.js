import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

const start = new Date("2026-10-18T12:00:00Z");

beforeEach(() => prisma.game.deleteMany());

// Creates a Game that finished finishedAfterMs after start and took timeMs.
// Without timeMs the Game is unfinished.
function addGame({ name, timeMs, sceneId = 1, finishedAfterMs = timeMs ?? 0 }) {
  const end = start.getTime() + finishedAfterMs;
  const finishedAt = timeMs === undefined ? null : new Date(end);
  const startedAt = new Date(end - (timeMs ?? 0));
  return prisma.game.create({
    data: { sceneId, startedAt, finishedAt, playerName: name },
  });
}

function getLeaderboard(sceneId = 1) {
  return request(app).get(`/scenes/${sceneId}/leaderboard`);
}

test("the Leaderboard lists Scores with name and time, fastest first", async () => {
  await addGame({ name: "Slow", timeMs: 90000 });
  await addGame({ name: "Fast", timeMs: 30500 });
  await addGame({ name: "Middle", timeMs: 61234 });

  const res = await getLeaderboard().expect(200);

  expect(res.body).toEqual([
    { name: "Fast", timeMs: 30500 },
    { name: "Middle", timeMs: 61234 },
    { name: "Slow", timeMs: 90000 },
  ]);
});

test("equal times are ordered by earliest finish", async () => {
  await addGame({ name: "Later", timeMs: 40000, finishedAfterMs: 50000 });
  await addGame({ name: "Earlier", timeMs: 40000, finishedAfterMs: 45000 });

  const res = await getLeaderboard().expect(200);

  expect(res.body.map((score) => score.name)).toEqual(["Earlier", "Later"]);
});

test("the Leaderboard has at most the 10 fastest Scores", async () => {
  for (let i = 12; i >= 1; i--) {
    await addGame({ name: `Player ${i}`, timeMs: i * 1000 });
  }

  const res = await getLeaderboard().expect(200);

  expect(res.body.map((score) => score.name)).toEqual(
    Array.from({ length: 10 }, (_, i) => `Player ${i + 1}`),
  );
});

test("unnamed, unfinished and other-Scene Games are left out", async () => {
  const other = await prisma.scene.create({
    data: { name: "Other Scene", imageUrl: "https://example.com/other.png" },
  });
  await addGame({ name: "Named", timeMs: 50000 });
  await addGame({ timeMs: 10000 });
  await addGame({ name: "Unfinished" });
  await addGame({ name: "Elsewhere", timeMs: 10000, sceneId: other.id });

  const res = await getLeaderboard().expect(200);

  expect(res.body).toEqual([{ name: "Named", timeMs: 50000 }]);
});

test("a Scene with no Scores has an empty Leaderboard", async () => {
  const res = await getLeaderboard().expect(200);

  expect(res.body).toEqual([]);
});

test("an unknown Scene returns 404", async () => {
  await getLeaderboard(999).expect(404);
});

test("a Scene id that isn't a number returns 404", async () => {
  await getLeaderboard("abc").expect(404);
});
