-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RETURN_REQUESTED';

-- AlterTable
ALTER TABLE "TransferRequest" ADD COLUMN     "decisionNote" TEXT;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
