-- CreateTable
CREATE TABLE "FoundCharacter" (
    "gameId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,

    CONSTRAINT "FoundCharacter_pkey" PRIMARY KEY ("gameId","characterId")
);

-- AddForeignKey
ALTER TABLE "FoundCharacter" ADD CONSTRAINT "FoundCharacter_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundCharacter" ADD CONSTRAINT "FoundCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
