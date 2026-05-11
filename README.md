This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend (Railway + Postgres + SMTP)

The frontend talks to a separate API service for OTP + account creation. The backend lives in `backend/`.

### Cloning the Railway database (move to new account)
This project uses Postgres (see `backend/prisma/schema.prisma`). To move *all data as-is* to a new Railway account:

1. Pause writes (temporarily stop the old backend service or enable maintenance mode).
2. Create a new Postgres service in the new Railway account and copy its `DATABASE_URL`.
3. Preferred (fastest): use PostgreSQL client tools locally (`pg_dump`, `pg_restore`, optional `psql`).
4. From `backend/`, run:

```powershell
$env:OLD_DATABASE_URL="postgresql://..."
$env:NEW_DATABASE_URL="postgresql://..."
./scripts/clone-railway-postgres.ps1
```

If you *don’t* have `pg_dump` available, there is a Prisma-based cloner (slower, but works anywhere Prisma runs):

```powershell
$env:OLD_DATABASE_URL="postgresql://..."
$env:NEW_DATABASE_URL="postgresql://..."
node ./scripts/clone-railway-postgres-prisma.js
```

### Backend setup
1. Create a Postgres database in Railway and copy the `DATABASE_URL`.
2. Set env vars for the backend (see `backend/.env.example`).
3. From `backend/`, run:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Frontend env
Set the API base URL in the frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
