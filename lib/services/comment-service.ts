import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Transaction,
  type Unsubscribe
} from "firebase/firestore";
import type { PostCardRecord, PostCommentRecord } from "@/lib/types/db";
import { db } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/services/profile-service";
import {
  createCommentRepliedNotification,
  createPostCommentedNotification
} from "@/lib/services/notification-service";

export type PostCommentThread = {
  roots: PostCommentRecord[];
  repliesByParentId: Record<string, PostCommentRecord[]>;
};

function asPostCommentRecord(snapshot: { id: string; data: () => unknown }): PostCommentRecord {
  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<PostCommentRecord, "id">)
  };
}

function sortByCreatedAscending<T extends { createdAt: { toMillis: () => number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
}

export function subscribeToPostComments(
  postId: string,
  onChange: (thread: PostCommentThread) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc")),
    (snapshots) => {
      const all = snapshots.docs.map(asPostCommentRecord);
      const visible = all.filter(
        (item) => !item.deletedByAuthor && !item.deletedByPostOwner && !item.hiddenByPostOwner
      );

      const roots = sortByCreatedAscending(visible.filter((item) => item.parentCommentId === ""));
      const repliesByParentId = visible
        .filter((item) => item.parentCommentId !== "")
        .reduce<Record<string, PostCommentRecord[]>>((accumulator, item) => {
          const current = accumulator[item.parentCommentId] ?? [];
          accumulator[item.parentCommentId] = [...current, item];
          return accumulator;
        }, {});

      onChange({
        roots,
        repliesByParentId: Object.fromEntries(
          Object.entries(repliesByParentId).map(([parentId, replies]) => [parentId, sortByCreatedAscending(replies)])
        )
      });
    }
  );
}

async function resolvePostAndReplyTarget(params: {
  postId: string;
  parentCommentId?: string;
}): Promise<{
  post: PostCardRecord;
  parentComment: PostCommentRecord | null;
}> {
  const postSnap = await getDoc(doc(db, "posts", params.postId));
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }

  const post = {
    id: postSnap.id,
    ...(postSnap.data() as Omit<PostCardRecord, "id">)
  };

  if (post.deleted) {
    throw new Error("Cannot comment on a deleted post");
  }

  if (!params.parentCommentId) {
    return { post, parentComment: null };
  }

  const parentSnap = await getDoc(doc(db, "comments", params.parentCommentId));
  if (!parentSnap.exists()) {
    throw new Error("Reply target not found");
  }

  const parentComment = {
    id: parentSnap.id,
    ...(parentSnap.data() as Omit<PostCommentRecord, "id">)
  };

  if (parentComment.postId !== params.postId) {
    throw new Error("Reply target is not part of this post");
  }

  if (parentComment.deletedByAuthor || parentComment.deletedByPostOwner || parentComment.hiddenByPostOwner) {
    throw new Error("Cannot reply to a removed comment");
  }

  return { post, parentComment };
}

export async function createComment(params: {
  actorUid: string;
  postId: string;
  content: string;
  parentCommentId?: string;
}) {
  const [actorProfile, { post, parentComment }] = await Promise.all([
    getUserProfile(params.actorUid),
    resolvePostAndReplyTarget({
      postId: params.postId,
      parentCommentId: params.parentCommentId
    })
  ]);

  if (!actorProfile) {
    throw new Error("Could not resolve your profile to comment");
  }

  const commentsRef = collection(db, "comments");
  const newCommentRef = doc(commentsRef);
  const rootCommentId = parentComment ? parentComment.rootCommentId || parentComment.id : newCommentRef.id;

  await runTransaction(db, async (tx) => {
    tx.set(newCommentRef, {
      postId: params.postId,
      authorUid: params.actorUid,
      authorAddress: actorProfile.address,
      content: params.content,
      parentCommentId: parentComment?.id ?? "",
      rootCommentId,
      replyCount: 0,
      hiddenByPostOwner: false,
      deletedByAuthor: false,
      deletedByPostOwner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

  });

  if (parentComment) {
    await createCommentRepliedNotification({
      recipientUid: parentComment.authorUid,
      actorUid: params.actorUid,
      postId: params.postId,
      commentId: newCommentRef.id
    });

    if (post.authorUid !== parentComment.authorUid) {
      await createPostCommentedNotification({
        recipientUid: post.authorUid,
        actorUid: params.actorUid,
        postId: params.postId,
        commentId: newCommentRef.id
      });
    }

    return;
  }

  await createPostCommentedNotification({
    recipientUid: post.authorUid,
    actorUid: params.actorUid,
    postId: params.postId,
    commentId: newCommentRef.id
  });
}

export async function deleteOwnComment(commentId: string, actorUid: string) {
  const commentRef = doc(db, "comments", commentId);

  await runTransaction(db, async (tx) => {
    const commentSnap = await tx.get(commentRef);
    if (!commentSnap.exists()) {
      throw new Error("Comment not found");
    }

    const comment = commentSnap.data();
    if (comment.authorUid !== actorUid) {
      throw new Error("You can only delete your own comments");
    }

    if (comment.deletedByAuthor === true) {
      return;
    }

    tx.update(commentRef, {
      deletedByAuthor: true,
      updatedAt: serverTimestamp()
    });
  });
}

async function assertActorOwnsCommentPost(tx: Transaction, params: {
  commentId: string;
  actorUid: string;
}) {
  const commentRef = doc(db, "comments", params.commentId);
  const commentSnap = await tx.get(commentRef);
  if (!commentSnap.exists()) {
    throw new Error("Comment not found");
  }

  const comment = commentSnap.data();
  const postSnap = await tx.get(doc(db, "posts", comment.postId));
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }

  const post = postSnap.data();
  if (post.authorUid !== params.actorUid) {
    throw new Error("Only the post owner can moderate comments");
  }

  return { commentRef, comment };
}

export async function hideCommentForPostOwner(params: {
  commentId: string;
  actorUid: string;
}) {
  await runTransaction(db, async (tx) => {
    const { commentRef, comment } = await assertActorOwnsCommentPost(tx, params);

    if (comment.hiddenByPostOwner === true) {
      return;
    }

    tx.update(commentRef, {
      hiddenByPostOwner: true,
      updatedAt: serverTimestamp()
    });
  });
}

export async function deleteCommentForPostOwner(params: {
  commentId: string;
  actorUid: string;
}) {
  await runTransaction(db, async (tx) => {
    const { commentRef, comment } = await assertActorOwnsCommentPost(tx, params);

    if (comment.deletedByPostOwner === true) {
      return;
    }

    tx.update(commentRef, {
      deletedByPostOwner: true,
      updatedAt: serverTimestamp()
    });
  });
}
