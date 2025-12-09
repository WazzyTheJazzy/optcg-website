-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "cost" INTEGER,
    "power" INTEGER,
    "counter" INTEGER,
    "attribute" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "effect" TEXT,
    "trigger" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT NOT NULL DEFAULT 'NM',
    "forTrade" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Collection_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'NM',
    "source" TEXT NOT NULL DEFAULT 'market',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "targetPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Watchlist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Trade_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeOffer_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT NOT NULL DEFAULT 'NM',
    "side" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardNumber_key" ON "Card"("cardNumber");

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "Card_set_idx" ON "Card"("set");

-- CreateIndex
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_cardId_idx" ON "Collection"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_cardId_condition_key" ON "Collection"("userId", "cardId", "condition");

-- CreateIndex
CREATE INDEX "PriceHistory_cardId_timestamp_idx" ON "PriceHistory"("cardId", "timestamp");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_cardId_key" ON "Watchlist"("userId", "cardId");

-- CreateIndex
CREATE INDEX "Trade_initiatorId_idx" ON "Trade"("initiatorId");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "TradeOffer_tradeId_idx" ON "TradeOffer"("tradeId");

-- CreateIndex
CREATE INDEX "TradeOffer_userId_idx" ON "TradeOffer"("userId");

-- CreateIndex
CREATE INDEX "TradeItem_tradeId_idx" ON "TradeItem"("tradeId");
