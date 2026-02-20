"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/layout/auth-provider";
import {
  createComment,
  deleteCommentForPostOwner,
  deleteOwnComment,
  hideCommentForPostOwner,
  subscribeToPostComments,
  type PostCommentThread
} from "@/lib/services/comment-service";
import type { PostCardRecord, PostCommentRecord } from "@/lib/types/db";
import { COMMENT_MAX_LENGTH } from "@/lib/utils/constants";
import { formatTimestamp } from "@/lib/utils/dates";
import { commentContentSchema } from "@/lib/utils/validation";

type CommentThreadProps = {
  post: PostCardRecord;
};

export function CommentThread({ post }: CommentThreadProps) {
  const { user } = useAuth();
  const [thread, setThread] = useState<PostCommentThread>({ roots: [], repliesByParentId: {} });
  const [composer, setComposer] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyOpenFor, setReplyOpenFor] = useState<Record<string, boolean>>({});
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    return subscribeToPostComments(post.id, (nextThread) => {
      setThread(nextThread);
      setLoading(false);
    });
  }, [post.id]);

  const totalComments = useMemo(
    () =>
      thread.roots.length +
      Object.values(thread.repliesByParentId).reduce((count, replies) => count + replies.length, 0),
    [thread]
  );

  if (!user) {
    return null;
  }

  const currentUser = user;
  const canModerate = currentUser.uid === post.authorUid;

  async function submitComment(parentCommentId?: string) {
    setError("");

    const sourceText = parentCommentId ? (replyDrafts[parentCommentId] ?? "") : composer;

    let parsed = "";
    try {
      parsed = commentContentSchema.parse(sourceText);
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Could not post comment.");
        return;
      }
      setError("Could not post comment.");
      return;
    }

    setBusyCommentId(parentCommentId ?? "root");

    try {
      await createComment({
        actorUid: currentUser.uid,
        postId: post.id,
        content: parsed,
        parentCommentId
      });

      if (parentCommentId) {
        setReplyDrafts((previous) => ({
          ...previous,
          [parentCommentId]: ""
        }));
        setReplyOpenFor((previous) => ({
          ...previous,
          [parentCommentId]: false
        }));
      } else {
        setComposer("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post comment.");
    } finally {
      setBusyCommentId(null);
    }
  }

  async function handleDeleteOwnComment(comment: PostCommentRecord) {
    setBusyCommentId(comment.id);
    setError("");

    try {
      await deleteOwnComment(comment.id, currentUser.uid);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete comment.");
    } finally {
      setBusyCommentId(null);
    }
  }

  async function handleHideComment(comment: PostCommentRecord) {
    setBusyCommentId(comment.id);
    setError("");

    try {
      await hideCommentForPostOwner({
        commentId: comment.id,
        actorUid: currentUser.uid
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not hide comment.");
    } finally {
      setBusyCommentId(null);
    }
  }

  async function handleDeleteCommentAsOwner(comment: PostCommentRecord) {
    setBusyCommentId(comment.id);
    setError("");

    try {
      await deleteCommentForPostOwner({
        commentId: comment.id,
        actorUid: currentUser.uid
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove comment.");
    } finally {
      setBusyCommentId(null);
    }
  }

  function renderComment(item: PostCommentRecord, depth = 0) {
    const replies = thread.repliesByParentId[item.id] ?? [];
    const isOwnComment = item.authorUid === currentUser.uid;
    const isBusy = busyCommentId === item.id;
    const replyValue = replyDrafts[item.id] ?? "";
    const replyRemaining = COMMENT_MAX_LENGTH - replyValue.length;
    const replyOpen = Boolean(replyOpenFor[item.id]);

    return (
      <article className="space-y-2 rounded border border-stamp-muted bg-white p-3" key={item.id}>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">@{item.authorAddress}</p>
            <p className="text-xs text-stamp-ink/60">{formatTimestamp(item.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              className="rounded border border-stamp-muted px-2 py-0.5 hover:bg-stamp-muted"
              onClick={() => {
                setReplyOpenFor((previous) => ({
                  ...previous,
                  [item.id]: !previous[item.id]
                }));
              }}
              type="button"
            >
              Reply
            </button>
            {isOwnComment ? (
              <button
                className="rounded border border-red-300 px-2 py-0.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  void handleDeleteOwnComment(item);
                }}
                type="button"
              >
                {isBusy ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            {canModerate ? (
              <>
                <button
                  className="rounded border border-amber-300 px-2 py-0.5 text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => {
                    void handleHideComment(item);
                  }}
                  type="button"
                >
                  {isBusy ? "Hiding..." : "Hide"}
                </button>
                <button
                  className="rounded border border-red-300 px-2 py-0.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => {
                    void handleDeleteCommentAsOwner(item);
                  }}
                  type="button"
                >
                  {isBusy ? "Removing..." : "Delete (owner)"}
                </button>
              </>
            ) : null}
          </div>
        </header>

        <p className="whitespace-pre-wrap text-sm text-stamp-ink">{item.content}</p>

        {replyOpen ? (
          <div className="space-y-2 rounded border border-stamp-muted bg-[#faf9f6] p-2">
            <textarea
              className="h-20 w-full resize-none rounded border border-stamp-muted px-2 py-1 text-sm"
              maxLength={COMMENT_MAX_LENGTH}
              onChange={(event) => {
                const value = event.target.value;
                setReplyDrafts((previous) => ({
                  ...previous,
                  [item.id]: value
                }));
              }}
              placeholder="Write a reply..."
              value={replyValue}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-stamp-ink/60">{replyRemaining} characters left</p>
              <button
                className="rounded border border-stamp-muted px-2 py-1 text-xs hover:bg-stamp-muted disabled:opacity-60"
                disabled={busyCommentId === item.id}
                onClick={() => {
                  void submitComment(item.id);
                }}
                type="button"
              >
                {busyCommentId === item.id ? "Replying..." : "Reply"}
              </button>
            </div>
          </div>
        ) : null}

        {replies.length > 0 ? (
          <div className="space-y-2 pl-3" style={{ marginLeft: `${Math.min(depth + 1, 4) * 6}px` }}>
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  }

  const remaining = COMMENT_MAX_LENGTH - composer.length;

  return (
    <section className="space-y-3 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Comments</h2>
        <p className="text-xs text-stamp-ink/65">{totalComments} total</p>
      </header>

      <div className="space-y-2">
        <textarea
          className="h-24 w-full resize-none rounded border border-stamp-muted px-3 py-2 text-sm"
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setComposer(event.target.value)}
          placeholder="Add a comment"
          value={composer}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-stamp-ink/60">{remaining} characters left</p>
          <button
            className="rounded border border-stamp-muted px-3 py-1 text-sm hover:bg-stamp-muted disabled:opacity-60"
            disabled={busyCommentId === "root"}
            onClick={() => {
              void submitComment();
            }}
            type="button"
          >
            {busyCommentId === "root" ? "Posting..." : "Post comment"}
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading comments...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && thread.roots.length === 0 ? (
        <p className="text-sm text-stamp-ink/70">No comments yet. Start the conversation.</p>
      ) : null}

      <div className="space-y-3">{thread.roots.map((item) => renderComment(item))}</div>
    </section>
  );
}
