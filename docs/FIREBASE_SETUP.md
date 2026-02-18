# Firebase Setup Guide

## 1) Create Firebase Project

- Go to Firebase Console
- Create project: `the-stamp`

## 2) Enable Authentication

- Authentication > Sign-in methods
- Enable **Email/Password**
- In templates/settings, configure email verification flow

## 3) Create Firestore Database

- Firestore Database > Create database
- Start in production mode (recommended)
- Region: choose near your users

## 4) Register Web App

- Project settings > Your apps > Web app
- Copy Firebase config into `.env.local`

## 5) Environment Variables

Create `.env.local` from `.env.example`.

## 6) Security Rules + Indexes

- Firestore rules file: `firestore.rules`
- Firestore index file: `firestore.indexes.json`

Deploy later with Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 7) Vercel

- Add all `NEXT_PUBLIC_FIREBASE_*` vars in Vercel project settings
- Redeploy
