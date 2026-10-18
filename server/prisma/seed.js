import "dotenv/config";
import { prisma } from "../src/db.js";

// Hit boxes measured by hand on the 2560x1600 beach picture.
await prisma.scene.create({
  data: {
    name: "Beach",
    imageUrl: "/images/beach.jpg",
    characters: {
      create: [
        { name: "Waldo", imageUrl: "/images/waldo.webp", x1: 0.6113, y1: 0.3468, x2: 0.6274, y2: 0.3944 },
        { name: "Wizard", imageUrl: "/images/wizard.webp", x1: 0.2648, y1: 0.325, x2: 0.2747, y2: 0.365 },
        { name: "Odlaw", imageUrl: "/images/odlaw.webp", x1: 0.1039, y1: 0.33, x2: 0.111, y2: 0.3688 },
      ],
    },
  },
});

await prisma.$disconnect();
