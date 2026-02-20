-- AlterTable
ALTER TABLE "User" ADD COLUMN "googleRefreshToken" TEXT;

-- CreateTable
CREATE TABLE "CalendarWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "channelToken" TEXT NOT NULL,
    "expiration" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarWatch_userId_key" ON "CalendarWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarWatch_channelId_key" ON "CalendarWatch"("channelId");
