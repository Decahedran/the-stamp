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
  commentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted: boolean;
}

export interface PostLike {
  postId: string;
  userUid: string;
  createdAt: Timestamp;
}

export type NotificationType =
  | "post_liked"
  | "friend_request_received"
  | "friend_request_accepted"
  | "post_commented"
  | "comment_replied";

export interface NotificationItem {
  recipientUid: string;
  actorUid: string;
  type: NotificationType;
  postId: string;
  commentId: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface PostComment {
  postId: string;
  authorUid: string;
  authorAddress: string;
  content: string;
  parentCommentId: string;
  rootCommentId: string;
  replyCount: number;
  hiddenByPostOwner: boolean;
  deletedByAuthor: boolean;
  deletedByPostOwner: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReportReason =
  | "bullying_harassment"
  | "sexual_content"
  | "violence_threats"
  | "self_harm"
  | "hate_abuse"
  | "spam"
  | "other";

export type ReportTargetType = "post" | "comment" | "profile";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface SafetyReport {
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reviewedByUid: string;
  reviewedAt: Timestamp | null;
  reviewNotes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserBlock {
  blockerUid: string;
  blockedUid: string;
  createdAt: Timestamp;
}

export type WithId<T> = T & { id: string };
export type FriendRequestRecord = WithId<FriendRequest>;
export type PostCardRecord = WithId<PostCard>;
export type PostCommentRecord = WithId<PostComment>;
export type SafetyReportRecord = WithId<SafetyReport>;
