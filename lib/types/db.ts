import type { Timestamp } from "firebase/firestore";

export type FriendRequestStatus = "pending" | "accepted";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  address: string;
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

export interface AddressReservation {
  uid: string;
  createdAt: Timestamp;
}

export interface FriendRequest {
  fromUid: string;
  toUid: string;
  status: FriendRequestStatus;
  createdAt: Timestamp;
  respondedAt: Timestamp | null;
}

export interface Friendship {
  users: [string, string];
  createdAt: Timestamp;
}

export interface PostCard {
  authorUid: string;
  authorAddress: string;
  content: string;
  likeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted: boolean;
}

export interface PostLike {
  postId: string;
  userUid: string;
  createdAt: Timestamp;
}

export interface NotificationItem {
  recipientUid: string;
  actorUid: string;
  type: "post_liked";
  postId: string;
  read: boolean;
  createdAt: Timestamp;
}

export type WithId<T> = T & { id: string };
export type FriendRequestRecord = WithId<FriendRequest>;
export type PostCardRecord = WithId<PostCard>;
