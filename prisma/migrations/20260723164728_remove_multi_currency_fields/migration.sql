/*
  Warnings:

  - You are about to drop the column `montant_cdf` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `montant_usd` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `taux_change` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "montant_cdf",
DROP COLUMN "montant_usd",
DROP COLUMN "taux_change";
