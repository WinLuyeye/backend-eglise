/*
  Warnings:

  - You are about to drop the column `montantCDF` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `montantUSD` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `tauxChange` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "montantCDF",
DROP COLUMN "montantUSD",
DROP COLUMN "tauxChange";
