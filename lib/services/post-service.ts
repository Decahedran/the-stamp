import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe
} from "firebase/firestore";
import type { PostCardRecord } from "@/lib/types/db";
import { db } from "@/lib/firebase/client";
import { FEED_WINDOW_HOURS, PROFILE_POSTS_PAGE_SIZE } from "@/lib/utils/constants";
import { createPostLikedNotification } from "@/lib/services/notification-service";

function createLikeId(postId: string, uid: string): string {
  return `${postId}_${uid}`;
}

export async function createPost(authorUid: string, authorAddress: string, content: string) {
  const postsRef = collection(db, "posts");
  const userRef = doc(db, "users", authorUid);

  await runTransaction(db, async (tx) => {
    tx.set(doc(postsRef), {
      authorUid,
      authorAddress,
      content,
      likeCount: 0,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    tx.update(userRef, {
      postCount: increment(1),
      updatedAt: serverTimestamp()
    });
  });
}

export async function deleteOwnPost(postId: string, actorUid: string) {
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }

    const postData = postSnap.data();
    if (postData.authorUid !== actorUid) {
      throw new Error("You can only delete your own post");
    }

    if (postData.deleted === true) {
      throw new Error("Post already deleted");
    }

    const likeCount = Number(postData.likeCount ?? 0);

    tx.update(postRef, {
      deleted: true,
      updatedAt: serverTimestamp()
    });

    tx.update(doc(db, "users", actorUid), {
      postCount: increment(-1),
      totalLikesReceived: increment(-likeCount),
      updatedAt: serverTimestamp()
    });
  });
}

export async function toggleLike(postId: string, actorUid: string) {
  const likeRef = doc(db, "postLikes", createLikeId(postId, actorUid));
  const postRef = doc(db, "posts", postId);

  let postAuthorUid = "";
  let liked = false;

  await runTransaction(db, async (tx) => {
    const [likeSnap, postSnap] = await Promise.all([tx.get(likeRef), tx.get(postRef)]);

    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }

    postAuthorUid = postSnap.data().authorUid as string;

    if (likeSnap.exists()) {
      liked = false;
      tx.delete(likeRef);
      tx.update(postRef, {
        likeCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      tx.update(doc(db, "users", postAuthorUid), {
        totalLikesReceived: increment(-1),
        updatedAt: serverTimestamp()
      });
      return;
    }

    liked = true;
    tx.set(likeRef, {
      postId,
      userUid: actorUid,
      createdAt: serverTimestamp()
    });
    tx.update(postRef, {
      likeCount: increment(1),
      updatedAt: serverTimestamp()
    });
    tx.update(doc(db, "users", postAuthorUid), {
      totalLikesReceived: increment(1),
      updatedAt: serverTimestamp()
    });
  });

  if (liked) {
    await createPostLikedNotification({
      recipientUid: postAuthorUid,
      actorUid,
      postId
    });
  }

  return { liked };
}

export async function hasUserLikedPost(postId: string, uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, "postLikes", createLikeId(postId, uid)));
  return snapshot.exists();
}

export function subscribeToRecentPosts(onChange: (posts: PostCardRecord[]) => void): Unsubscribe {
  const cutoffDate = new Date(Date.now() - FEED_WINDOW_HOURS * 60 * 60 * 1000);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  return onSnapshot(
    query(
      collection(db, "posts"),
      where("deleted", "==", false),
      where("createdAt", ">=", cutoffTimestamp),
      orderBy("createdAt", "desc")
    ),
    (snapshots) => {
      onChange(
        snapshots.docs.map((snapshot) => ({
          id: snapshot.id,
          ...(snapshot.data() as Omit<PostCardRecord, "id">)
        }))
      );
    }
  );
}

export function subscribeToPostById(
  postId: string,
  onChange: (post: PostCardRecord | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "posts", postId), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }

    const post = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<PostCardRecord, "id">)
    };

    if (post.deleted) {
      onChange(null);
      return;
    }

    onChange(post);
  });
}

export async function getFeedPosts(visibleAuthorUids: string[]): Promise<PostCardRecord[]> {
  if (visibleAuthorUids.length === 0) {
    return [];
  }

  const cutoffDate = new Date(Date.now() - FEED_WINDOW_HOURS * 60 * 60 * 1000);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const feedQuery = query(
    collection(db, "posts"),
    where("deleted", "==", false),
    where("createdAt", ">=", cutoffTimestamp),
    orderBy("createdAt", "desc")
  );

  const snapshots = await getDocs(feedQuery);

  return snapshots.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as Omit<PostCardRecord, "id">)
    }))
    .filter((post) => visibleAuthorUids.includes(post.authorUid));
}

export type ProfilePostsPage = {
  posts: PostCardRecord[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
};

export async function getProfilePostsPageByUid(
  uid: string,
  options?: {
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
  }
): Promise<ProfilePostsPage> {
  const pageSize = options?.pageSize ?? PROFILE_POSTS_PAGE_SIZE;

  const baseQuery = query(
    collection(db, "posts"),
    where("authorUid", "==", uid),
    where("deleted", "==", false),
    orderBy("createdAt", "desc")
  );

  const pageQuery = options?.cursor
    ? query(baseQuery, startAfter(options.cursor), limit(pageSize))
    : query(baseQuery, limit(pageSize));

  const snapshots = await getDocs(pageQuery);
  const posts = snapshots.docs.map((snapshot) => ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<PostCardRecord, "id">)
  }));

  return {
    posts,
    nextCursor: snapshots.docs.length < pageSize ? null : snapshots.docs[snapshots.docs.length - 1]
  };
}

export async function getProfilePostsByUid(uid: string): Promise<PostCardRecord[]> {
  const profileQuery = query(
    collection(db, "posts"),
    where("authorUid", "==", uid),
    where("deleted", "==", false),
    orderBy("createdAt", "desc")
  );

  const snapshots = await getDocs(profileQuery);
  return snapshots.docs.map((snapshot) => ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<PostCardRecord, "id">)
  }));
}

export async function getPostById(postId: string): Promise<PostCardRecord | null> {
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...(snap.data() as Omit<PostCardRecord, "id">)
  };
}
