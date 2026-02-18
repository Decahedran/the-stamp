# CHANGELOG

## 2026-02-18

### Added
- Bootstrapped repository structure for Next.js app router architecture.
- Added base project configs:
  - `package.json`
  - `tsconfig.json`
  - `next.config.mjs`
  - `tailwind.config.ts`
  - `postcss.config.mjs`
  - `.eslintrc.json`
  - `.env.example`
  - `.gitignore`
- Added foundational docs:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/FIREBASE_SETUP.md`
  - `docs/HANDOFF.md`
  - `docs/CHANGELOG.md`

### Added (continued)
- App shell and route pages:
  - `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
  - `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`
  - `app/feed/page.tsx`, `app/profile/[address]/page.tsx`, `app/settings/profile/page.tsx`
- Firebase/domain foundation:
  - `lib/firebase/client.ts`
  - `lib/types/db.ts`
  - `lib/utils/constants.ts`, `lib/utils/address.ts`, `lib/utils/validation.ts`
- Service layer scaffold:
  - `lib/services/auth-service.ts`
  - `lib/services/profile-service.ts`
  - `lib/services/friendship-service.ts`
  - `lib/services/post-service.ts`
  - `lib/services/notification-service.ts`
- Security/deploy scaffolding:
  - `firestore.rules`
  - `storage.rules`
  - `firebase.json`

### Changed
- Refined friendship query logic to avoid brittle `or/and` constraints.
- Updated friend removal behavior to document deletion for v1 simplicity.
- Removed unused imports in generated service modules.

### Changed (continued)
- Wired provided Firebase project config into local `.env.local`.
- Removed Storage dependency from runtime Firebase client.
- Updated docs and deployment config to Firestore/Auth only.
- Removed `storage.rules` and storage entry from `firebase.json`.

### Added (auth flow)
- Implemented client auth state/context:
  - `components/layout/auth-provider.tsx`
- Implemented auth-aware navigation:
  - `components/layout/top-nav.tsx`
- Implemented protected route wrapper with verification gate:
  - `components/layout/require-auth.tsx`
- Implemented complete sign-up page flow:
  - zod validation
  - address availability precheck
  - Firebase sign-up + email verification
  - profile initialization transaction
  - post-signup signed-out verification UX
- Implemented complete sign-in page flow:
  - zod validation
  - verified-email redirect behavior
  - resend verification + refresh status actions
- Protected `/feed` and `/settings/profile` behind authentication and verification.

### Changed (auth/service)
- Enhanced `lib/services/auth-service.ts` with:
  - `resendVerificationEmail`
  - `reloadCurrentUser`
  - `deleteCurrentUserAccount`
- Enhanced `lib/services/profile-service.ts` with `isAddressAvailable`.
- Added `emailSchema` and `passwordSchema` in `lib/utils/validation.ts`.

### Added (feed/profile/friends wave)
- Built feed feature UI:
  - `components/feed/feed-view.tsx`
  - `components/posts/post-composer.tsx`
  - `components/posts/post-card.tsx`
- Built friend management feature UI:
  - `components/friends/friend-panel.tsx`
  - search by @ddress
  - send request
  - accept incoming requests
  - remove friend
- Built profile history UI:
  - `components/profile/profile-view.tsx`
  - address -> uid lookup
  - newest-first post history
  - own-post deletion
  - like toggling in profile view
- Added utility:
  - `lib/utils/dates.ts`

### Changed (feed/profile/friends services)
- `lib/services/profile-service.ts`:
  - added `getUidByAddress`
  - added `getUserProfileByAddress`
- `lib/services/friendship-service.ts`:
  - added `areFriends`
  - added `getIncomingFriendRequests`
- `lib/services/post-service.ts`:
  - added `hasUserLikedPost`
  - added typed return records for post fetchers
- Updated route pages:
  - `app/feed/page.tsx` now renders `FeedView`
  - `app/profile/[address]/page.tsx` now renders `ProfileView` behind auth guard

### Fixed (build validation)
- Resolved Next.js prerender error on `/sign-in` by wrapping `useSearchParams()` usage in a Suspense boundary.
- Refactored sign-in page into `SignInContent` + Suspense wrapper.

### Validation
- `npm run typecheck` passed.
- `npm run build` passed successfully.

### Added (notifications/settings wave)
- Built notifications feature UI:
  - `app/notifications/page.tsx`
  - `components/notifications/notification-center.tsx`
  - unread count display
  - mark notification as read
- Built profile settings feature UI:
  - `components/profile/profile-settings-form.tsx`
  - editable display name + bio
  - preset theme selector
  - @ddress update form with cooldown messaging
- Updated nav links for authenticated users:
  - Feed
  - Notifications
  - Settings

### Changed (notifications/settings services)
- `lib/services/notification-service.ts`:
  - added `getNotificationsForUser`
  - added `markNotificationRead`
- `lib/services/profile-service.ts`:
  - added `getNextAddressChangeDate`
  - added `updateAddress` transaction (reserve new, release old, enforce weekly cooldown)
- `app/settings/profile/page.tsx` now renders full settings form.

### Changed (security hardening wave)
- Rewrote `firestore.rules` with field-level and transition constraints for:
  - users
  - addresses
  - friendRequests
  - friendships
  - posts
  - postLikes
  - notifications
- Added schema-like validation in rules (address format, post length, allowed field updates).
- Added update-transition guards (e.g., pending -> accepted friend request, post soft-delete behavior, likeCount delta updates).
- Added `firestore.indexes.json` for key query patterns.
- Updated `firebase.json` to include Firestore indexes config.

### Added (quality + feed/profile scale wave)
- Added GitHub Actions CI workflow:
  - `.github/workflows/ci.yml`
  - runs lint, typecheck, and build on push/PR
- Added profile post pagination service API:
  - `getProfilePostsPageByUid` in `lib/services/post-service.ts`
  - cursor-based incremental loading support

### Changed (quality + feed/profile scale wave)
- `components/feed/feed-view.tsx` now resolves and displays author display names for friend posts.
- `components/profile/profile-view.tsx` now uses incremental loading with "Load more postcards".
- `lib/utils/constants.ts` now includes `PROFILE_POSTS_PAGE_SIZE`.

### Validation (quality + feed/profile scale wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Added (optimistic UX + nav unread badge wave)
- Added unread notification badge component:
  - `components/notifications/unread-badge.tsx`
- Added unread count service API:
  - `getUnreadNotificationCount` in `lib/services/notification-service.ts`
- Wired unread badge into top nav notifications link.

### Changed (optimistic UX + nav unread badge wave)
- `components/feed/feed-view.tsx` like interactions now update optimistically with rollback on failure.
- `components/profile/profile-view.tsx` like interactions now update optimistically with rollback on failure.
- `components/friends/friend-panel.tsx` now uses optimistic state updates for accept/remove friend actions.
- Friend-request send flow now shows immediate sending status feedback.

### Validation (optimistic UX + nav unread badge wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Changed (realtime listeners wave)
- `components/notifications/unread-badge.tsx` now uses Firestore `onSnapshot` for live unread badge updates.
- `components/notifications/notification-center.tsx` now uses Firestore `onSnapshot` for live notification list updates.
- `components/friends/friend-panel.tsx` now uses Firestore `onSnapshot` for live friend and incoming-request state updates.
- `lib/services/notification-service.ts` now includes:
  - `subscribeToNotificationsForUser`
  - `subscribeToUnreadNotificationCount`
- `lib/services/friendship-service.ts` now includes:
  - `subscribeToFriendIds`
  - `subscribeToIncomingFriendRequests`
- Removed interval-based polling approach for nav unread count.

### Validation (realtime listeners wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Changed (realtime feed wave)
- `components/feed/feed-view.tsx` now uses realtime subscriptions for:
  - friend IDs (`subscribeToFriendIds`)
  - recent postcard stream (`subscribeToRecentPosts`)
- Feed visibility is now computed client-side from realtime state:
  - includes self + friends only
  - enforces rolling 24h window
- Feed composer and friend panel callbacks are now no-op refresh hooks because listeners own state updates.
- `lib/services/post-service.ts` now includes `subscribeToRecentPosts`.

### Validation (realtime feed wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Added (notification deep-link wave)
- Added dynamic postcard detail route:
  - `app/post/[postId]/page.tsx`
- Added postcard detail component:
  - `components/posts/post-detail-view.tsx`
  - loads post by id
  - shows author context
  - supports optimistic like/unlike from detail page
- Updated notifications UI links:
  - `components/notifications/notification-center.tsx` now includes `View postcard` deep-link per notification item

### Validation (notification deep-link wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Changed (realtime single-post QoL wave)
- `components/posts/post-detail-view.tsx` now uses realtime subscription for individual postcard updates.
- `lib/services/post-service.ts` now includes `subscribeToPostById` helper.
- Post detail view now reflects live like count / deletion state changes without manual refresh.

### Validation (realtime single-post QoL wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Changed (optimistic profile-delete QoL wave)
- `components/profile/profile-view.tsx` delete action now updates UI optimistically:
  - removes postcard immediately from local list
  - decrements local profile post/likes counters immediately
  - rolls back post list, liked map, and profile stats if deletion fails

### Validation (optimistic profile-delete QoL wave)
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

### Decisions Captured
- Feed is strict 24-hour rolling window.
- `@ddress` uniqueness + weekly change cooldown.
- Text-only posts (280 char limit).
- Likes are toggle and tracked in profile stats.
- Firebase Storage is not used in v1; profile visuals are preset themes.
