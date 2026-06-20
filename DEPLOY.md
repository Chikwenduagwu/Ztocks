# Deploying this monorepo to Vercel

This repo has the Next.js app inside `frontend/`, not at the repo
root (contracts and the price-pusher script live alongside it). The
reliable, Vercel-documented way to handle this is the dashboard's
**Root Directory** setting — not a root-level `vercel.json` that
tries to `cd` into a subfolder, which is a known source of
"No Output Directory found" failures because Next.js's framework
auto-detection (and its expected `.next` output location) assumes
it's running from the directory it's told is the project root.

## Steps

1. **Import the repo** at vercel.com/new, selecting this Git repository.
2. Before the first deploy, go to **Settings → General → Root Directory**
   and set it to:
   ```
   frontend
   ```
3. Leave **Build Command**, **Output Directory**, and **Install
   Command** on their auto-detected Next.js defaults — don't override
   them. Vercel's Next.js preset handles all three correctly once
   Root Directory is set.
4. Add your environment variables (the same ones in
   `frontend/.env.example`) under **Settings → Environment Variables**.
5. Deploy.

`.vercelignore` at the repo root still applies and keeps `contracts/`
and `frontend/scripts/price-pusher/` out of the build entirely, so
Vercel never wastes time on files it doesn't need.

## Why not a root vercel.json?

A `buildCommand: "cd frontend && npm install && npm run build"` at
the repo root technically runs, but Next.js's own build process writes
`.next` relative to wherever it was invoked — combined with Vercel's
framework detection expecting that output in a specific place, this
is a documented way to hit "No Output Directory named 'public' found"
or similar mismatches after the build otherwise succeeds. The Root
Directory dashboard setting is the approach Vercel's own docs and
support threads consistently point to for exactly this monorepo shape
(framework subdirectory, not a workspaces-based monorepo), so that's
what's documented here instead.
