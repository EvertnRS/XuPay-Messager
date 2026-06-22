ALTER TABLE "Message" DROP COLUMN "source";
ALTER TABLE "Message" DROP COLUMN "type";
ALTER TABLE "Message" RENAME COLUMN "payload" TO "payloadEncrypted";
