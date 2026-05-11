-- Profile link choices + queue ordering

DO $$ BEGIN
  CREATE TYPE "ProfileChoice" AS ENUM ('YES','NO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "linkedinChoice" "ProfileChoice";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubChoice" "ProfileChoice";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileQueueNumber" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "queuedAt" TIMESTAMPTZ;

DO $$ BEGIN
  CREATE UNIQUE INDEX "User_profileQueueNumber_key" ON "User"("profileQueueNumber");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS "profile_queue_seq" START 1;

