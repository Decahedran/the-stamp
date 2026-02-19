# The Stamp 💌

A small-scale social platform with a postcard aesthetic where people share short status updates ("postcards").

## Core v1 Features

- Email/password auth via Firebase Auth
- Email verification is optional (currently not enforced by the app)
- Unique public handle called `@ddress`
- Friend request system (request/accept/remove)
- Feed shows only:
  - accepted friends' posts
  - your own posts
  - last 24 hours only (rolling)
  - newest first
- Profile pages (your own + others): all posts, newest first
- Text-only posts (max 280 chars)
- Post likes (toggle)
- Notifications when someone likes your post
- Profile stats:
  - total post count
  - total likes received (sum across all posts)
- User can delete own posts from profile view
- Profile editing:
  - display name
  - bio
  - profile style theme (preset avatar/background)
  - `@ddress` change limited to once per 7 days

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore)
- Vercel hosting

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill Firebase values.

3. Start dev server:

```bash
npm run dev
```

4. Open http://localhost:3000

## Firebase Setup (high level)

See `docs/FIREBASE_SETUP.md`.

> Note: Firebase Storage is intentionally not used in v1.

## Data Model + Architecture

See `docs/ARCHITECTURE.md`.

## Handoff + Change Tracking

- `docs/HANDOFF.md` = persistent context for future sessions
- `docs/CHANGELOG.md` = chronological technical changes

## Deployment

- Connect repo to Vercel
- Add env vars from `.env.local` to Vercel Project Settings
- Deploy from `main`
