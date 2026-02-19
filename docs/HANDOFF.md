# HANDOFF - The Stamp

## Project Identity

- Name: **The Stamp**
- Repo: https://github.com/Decahedran/the-stamp.git
- Owner: Derek
- Agent: code-puppy-b13e73

## Product Scope (agreed v1)

- Web only
- Text-only posts (max 280)
- Email/password auth
- Email verification currently not enforced (optional)
- Unique handle called `@ddress`
- Display name is separate from @ddress
- Mutual friend system (request + accept)
- Remove friend supported
- Feed includes friends + self only, last 24h rolling, newest first
- Profiles show all posts (newest first), no time limit
- Likes are toggle (like/unlike)
- Notifications for likes
- Profile stats: post count + total likes received
- Users can delete own posts
- Profile editable
- `@ddress` change: max once per week, released handle becomes available again
- No Firebase Storage usage in v1 (credit-card requirement)
- Profile visuals use preset/default themes only
- Deploy on Vercel default domain first

## Architecture Decisions

- Next.js 14 + TypeScript + Tailwind
- Firebase SDK with service-layer wrappers
- Small modular files (target < 600 lines each)
- Documentation-first workflow with persistent handoff + changelog

## Current Status

- [x] Empty repo cloned
- [x] Base project config files created
- [x] Core architecture docs created
- [x] App router skeleton pages created
- [x] Firebase client module created
- [x] Domain types and validators created
- [x] Service modules scaffolded (auth/profile/friendship/post/notification)
- [x] Firestore rules file added
- [x] Storage removed from architecture and config
- [x] UI form wiring for auth completed (sign-up/sign-in)
- [x] Auth provider + route guard completed (verification gate removed)
- [x] Feed composer + 24h feed list implemented
- [x] Profile page data loading + own post delete implemented
- [x] Friend search/request/accept/remove UI implemented
- [x] Build/typecheck smoke test passed
- [x] Notification center UI implemented
- [x] Profile settings form implemented (display/bio/theme + @ddress cooldown UX)
- [x] Firestore rules hardened with field-level constraints
- [x] Firestore indexes config added for feed/profile/notifications queries
- [x] Feed author display enriched (display names resolved)
- [x] Profile history incremental loading implemented
- [x] GitHub Actions CI workflow added (lint + typecheck + build)
- [x] Optimistic UI added for likes and key friend actions
- [x] Unread notification badge added to top navigation
- [x] Realtime listeners added for notifications + friend state
- [x] Realtime feed updates added for friend/self postcards
- [x] Notification deep-linking to individual postcard route implemented
- [x] Realtime single-post updates implemented on postcard detail route
- [x] Launch patch applied: Next.js upgraded to patched 14.2.35 + Vercel output config added

## Implemented File Highlights

- `lib/firebase/client.ts` - initialized auth/firestore client
- `lib/types/db.ts` - core Firestore data contracts
- `lib/services/auth-service.ts` - sign-up/sign-in/sign-out + optional verification helpers + reload + account cleanup
- `lib/services/profile-service.ts` - profile creation/updates + address availability + address lookup
- `lib/services/friendship-service.ts` - request/accept/remove + incoming requests + friendship checks + realtime subscriptions
- `lib/services/post-service.ts` - create/delete/toggle-like/feed/profile queries + realtime feed subscription + profile pagination cursor API
- `lib/services/notification-service.ts` - like notification creation + unread count queries + realtime subscriptions
- `firestore.rules` - hardened Firestore security model with field/transition guards
- `components/layout/auth-provider.tsx` - client auth state context
- `components/layout/require-auth.tsx` - protected-route wrapper (auth-only)
- `components/layout/top-nav.tsx` - navigation with auth-aware actions + unread badge
- `components/feed/feed-view.tsx` - realtime feed orchestration (composer + post list) + author display-name resolution
- `components/friends/friend-panel.tsx` - friend management UI with optimistic accept/remove actions
- `components/friends/friends-view.tsx` - dedicated friends page view wrapper
- `components/profile/profile-view.tsx` - profile loading with incremental post-history pagination
- `components/profile/profile-settings-form.tsx` - profile + @ddress settings UI
- `components/posts/post-composer.tsx` - 280-char post creation UI
- `components/posts/post-card.tsx` - reusable post card with like/delete actions
- `components/posts/post-detail-view.tsx` - single postcard detail view for deep-linked notifications
- `components/notifications/unread-badge.tsx` - top-nav unread notifications badge
- `components/notifications/notification-center.tsx` - realtime notifications inbox + mark-read actions
- `.github/workflows/ci.yml` - CI quality gate for lint/typecheck/build

## Next Session Priority Queue

1. Optional: move like/stat counter updates to Cloud Functions for stronger integrity guarantees
2. Add end-to-end Firestore emulator tests for rules regression safety
3. Optional: cache author/profile lookups in realtime feed to reduce duplicate reads
4. Optional: add bookmark/share UX around `/post/[postId]` deep links
5. Optional: add per-action loading states to disable only the affected postcard buttons
