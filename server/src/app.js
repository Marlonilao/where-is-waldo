import express from "express";
import { prisma } from "./db.js";

const app = express();

app.use(express.json());

app.post("/games", async (req, res) => {
  const scene = await prisma.scene.findUnique({
    where: { id: req.body.sceneId },
    include: {
      characters: { select: { id: true, name: true }, orderBy: { id: "asc" } },
    },
  });
  if (!scene) return res.sendStatus(404);

  const game = await prisma.game.create({
    data: { sceneId: scene.id, startedAt: new Date() },
  });
  res.status(201).json({
    id: game.id,
    imageUrl: scene.imageUrl,
    characters: scene.characters,
  });
});

app.post("/games/:id/guesses", async (req, res) => {
  const { characterId, x, y } = req.body ?? {};
  const game = await prisma.game.findUnique({ where: { id: req.params.id } });
  if (!game) return res.sendStatus(404);
  if (game.finishedAt) return res.sendStatus(409);

  const isFraction = (n) => typeof n === "number" && n >= 0 && n <= 1;
  if (!Number.isInteger(characterId) || !isFraction(x) || !isFraction(y)) {
    return res.sendStatus(400);
  }
  const character = await prisma.character.findFirst({
    where: { id: characterId, sceneId: game.sceneId },
  });
  if (!character) return res.sendStatus(400);

  const correct =
    x >= character.x1 &&
    x <= character.x2 &&
    y >= character.y1 &&
    y <= character.y2;
  if (!correct) return res.json({ correct });

  await prisma.foundCharacter.createMany({
    data: { gameId: game.id, characterId: character.id },
    skipDuplicates: true,
  });
  const { x1, y1, x2, y2 } = character;
  const hitBox = { x1, y1, x2, y2 };

  const [found, total] = await Promise.all([
    prisma.foundCharacter.count({ where: { gameId: game.id } }),
    prisma.character.count({ where: { sceneId: game.sceneId } }),
  ]);
  if (found < total) return res.json({ correct, hitBox, finished: false });

  // Only one Guess may finish the Game, even if two arrive at once.
  const finishedAt = new Date();
  const { count } = await prisma.game.updateMany({
    where: { id: game.id, finishedAt: null },
    data: { finishedAt },
  });
  if (count === 0) return res.sendStatus(409);
  res.json({
    correct,
    hitBox,
    finished: true,
    timeMs: finishedAt - game.startedAt,
  });
});

app.put("/games/:id/name", async (req, res) => {
  const game = await prisma.game.findUnique({ where: { id: req.params.id } });
  if (!game) return res.sendStatus(404);
  if (!game.finishedAt || game.playerName) return res.sendStatus(409);

  const { name } = req.body ?? {};
  const playerName = typeof name === "string" ? name.trim() : "";
  if (playerName.length < 1 || playerName.length > 20) {
    return res.sendStatus(400);
  }

  // Only one name may stick, even if two arrive at once.
  const { count } = await prisma.game.updateMany({
    where: { id: game.id, finishedAt: { not: null }, playerName: null },
    data: { playerName },
  });
  if (count === 0) return res.sendStatus(409);
  res.sendStatus(204);
});

export default app;
