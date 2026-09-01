-- CreateTable
CREATE TABLE "nutrition_target" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_meal" (
    "id" TEXT NOT NULL,
    "nutritionDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_meal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_target_userId_idx" ON "nutrition_target"("userId");

-- CreateIndex
CREATE INDEX "nutrition_day_userId_idx" ON "nutrition_day"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_day_userId_date_key" ON "nutrition_day"("userId", "date");

-- CreateIndex
CREATE INDEX "nutrition_meal_nutritionDayId_idx" ON "nutrition_meal"("nutritionDayId");

-- AddForeignKey
ALTER TABLE "nutrition_target" ADD CONSTRAINT "nutrition_target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_day" ADD CONSTRAINT "nutrition_day_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_meal" ADD CONSTRAINT "nutrition_meal_nutritionDayId_fkey" FOREIGN KEY ("nutritionDayId") REFERENCES "nutrition_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
