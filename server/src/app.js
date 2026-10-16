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

export default app;
