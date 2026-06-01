-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMarketCap" DOUBLE PRECISION NOT NULL,
    "totalVolume24h" DOUBLE PRECISION NOT NULL,
    "btcDominance" DOUBLE PRECISION NOT NULL,
    "ethDominance" DOUBLE PRECISION NOT NULL,
    "usdtDominance" DOUBLE PRECISION NOT NULL,
    "bnbDominance" DOUBLE PRECISION NOT NULL,
    "othersDominance" DOUBLE PRECISION NOT NULL,
    "totalExBtc" DOUBLE PRECISION NOT NULL,
    "totalExTop10" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartDrawing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "hlines" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "ChartDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketSnapshot_timestamp_idx" ON "MarketSnapshot"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ChartDrawing_userId_coinId_key" ON "ChartDrawing"("userId", "coinId");

-- AddForeignKey
ALTER TABLE "ChartDrawing" ADD CONSTRAINT "ChartDrawing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
