/*
  Warnings:

  - You are about to drop the column `service` on the `Message` table. All the data in the column will be lost.
  - Added the required column `event` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Event" AS ENUM ('CREATE_TRANSACTION', 'UPDATE_TRANSACTION', 'DELETE_TRANSACTION', 'CREATE_HISTORY', 'UPDATE_CUSTOMER');

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "service",
ADD COLUMN     "event" "Event" NOT NULL;
