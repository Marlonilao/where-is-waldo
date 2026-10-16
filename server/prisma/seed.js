import "dotenv/config";
import { prisma } from "../src/db.js";

// Placeholder until the real picture is chosen; re-measure the Hit boxes for it.
await prisma.scene.create({
  data: {
    name: "Placeholder Scene",
    imageUrl: "https://placehold.co/1600x1000",
    characters: {
      create: [
        { name: "Waldo", x1: 0.62, y1: 0.31, x2: 0.66, y2: 0.4 },
        { name: "Wizard", x1: 0.18, y1: 0.7, x2: 0.22, y2: 0.8 },
        { name: "Odlaw", x1: 0.84, y1: 0.12, x2: 0.88, y2: 0.21 },
      ],
    },
  },
});

await prisma.$disconnect();
