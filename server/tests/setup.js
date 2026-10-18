import { afterAll } from "vitest";
import { prisma } from "../src/db.js";

// Every test file starts from the same small Scene with known Hit boxes.
await prisma.$executeRawUnsafe(
  'TRUNCATE "Game", "Character", "Scene" RESTART IDENTITY CASCADE',
);
await prisma.scene.create({
  data: {
    name: "Test Scene",
    imageUrl: "https://example.com/test-scene.png",
    characters: {
      create: [
        { name: "Waldo", imageUrl: "https://example.com/waldo.png", x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
        { name: "Wenda", imageUrl: "https://example.com/wenda.png", x1: 0.5, y1: 0.5, x2: 0.6, y2: 0.7 },
      ],
    },
  },
});

afterAll(() => prisma.$disconnect());
