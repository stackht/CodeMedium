-- Add optional profile links to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubUrl" TEXT;

