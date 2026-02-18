# The Stamp - Architecture (v1)

## Design Principles

- Keep files small and composable.
- Prefer explicit domain boundaries over tangled utility blobs.
- DRY where behavior repeats; avoid over-abstraction (YAGNI).
- Client app is thin; domain rules validated in both app and Firestore rules.

## App Layers

1. **UI Layer** (`app`, `components`)
   - Rendering, interaction, navigation.
2. **Domain Services** (`lib/services`)
   - Encapsulates Firestore/Auth/Storage operations.
3. **Platform Clients** (`lib/firebase`)
   - Firebase app/auth/db/storage initialization.
4. **Types + Validation** (`lib/types`, `lib/utils`)
   - Shared schemas and small pure helpers.

## Firestore Collections (planned)

### `users/{uid}`

```ts
{
  uid: string;
  email: string;
  displayName: string;
  address: string; // unique, lower-case, no @ stored
  bio: string;
  photoUrl: string;
  backgroundUrl: string;
  postCount: number;
  totalLikesReceived: number;
  addressLastChangedAt: Timestamp | null;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `addresses/{address}`

Handle reservation map.

```ts
{
  uid: string;
  createdAt: Timestamp;
}
```

### `friendRequests/{requestId}`

```ts
{
  fromUid: string;
  toUid: string;
  status: "pending" | "accepted";
  createdAt: Timestamp;
  respondedAt: Timestamp | null;
}
```

### `friendships/{friendshipId}`

Canonical sorted pair key: `${smallerUid}_${largerUid}`

```ts
{
  users: [string, string];
  createdAt: Timestamp;
}
```

### `posts/{postId}`

```ts
{
  authorUid: string;
  authorAddress: string;
  content: string; // max 280
  likeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted: boolean;
}
```

### `postLikes/{postId_uid}`

```ts
{
  postId: string;
  userUid: string;
  createdAt: Timestamp;
}
```

### `notifications/{notificationId}`

```ts
{
  recipientUid: string;
  actorUid: string;
  type: "post_liked";
  postId: string;
  read: boolean;
  createdAt: Timestamp;
}
```

## Feed Query Strategy

- Resolve friend UIDs + own UID.
- Query recent posts from last 24h (`createdAt >= now - 24h`) in descending order.
- Filter by allowed author set (friend + self).
- Keep output newest -> oldest.

> Note: For scale, this will move to fan-out or feed index later. For v1 small-scale this is sufficient.

## Address Change Rule

- Allowed only if:
  - new address unused
  - `addressLastChangedAt` older than 7 days
- On success:
  - reserve new address doc
  - delete old address doc
  - update user profile

## Likes + Stats Consistency

Use Firestore transactions for:
- toggling like
- increment/decrementing `posts.likeCount`
- increment/decrementing `users.totalLikesReceived`

## Profile Visuals (No Storage in v1)

- No file uploads in v1 (to avoid paid requirements).
- Use preset/default avatar and background themes.
- Keep profile media fields as simple theme identifiers for now.
