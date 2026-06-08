-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PLANNING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('INFO', 'SUCCESS', 'ERROR', 'SCREENSHOT');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "taskType" TEXT,
    "stepsJson" JSONB,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "screenshotB64" TEXT,
    "status" "LogStatus" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
