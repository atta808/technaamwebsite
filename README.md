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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically load and optimize Geist, a font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js tutorial.
- [Next.js GitHub repository](https://github.com/vercel/next.js).

## Deploy on Vercel

For deployment guidance, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## TechNaam Phase 7B handoff

**Working branch:** `technaam-phase7b-repair`  
**Last handoff update:** 2026-10-16  
**Status:** Local contract, TypeScript, and production-build checks pass; live edge-case verification and release review remain.

Latest observed local checks:

- `npm run test:agent-api` — **13/13 static contract checks passed**.
- `npx tsc --noEmit` — returned without displaying TypeScript errors.
- `npm run build` — completed successfully; Next.js reported static page generation 21/21.
- `git diff --check` — no whitespace errors reported.

These checks do not certify production readiness. Live tests for disabled retail proposals, malformed requests, and missing/invalid/expired tokens remain outstanding. The local `supabase/config.toml` is intentionally untracked and was not committed. No merge into `main`, hosted Supabase change, or deployment was performed as part of this checkpoint.

See [`docs/PHASE7B_STATUS_AND_ROADMAP.md`](docs/PHASE7B_STATUS_AND_ROADMAP.md) for the detailed verification log, current limitations, remaining checklist, and proposed controlled OpenClaw pilot roadmap.