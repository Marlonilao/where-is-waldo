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
  res.json({ correct, hitBox: { x1, y1, x2, y2 } });
});

export default app;
