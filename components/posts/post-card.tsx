"use client";

import Link from "next/link";
import type { PostCardRecord } from "@/lib/types/db";
import { formatTimestamp } from "@/lib/utils/dates";

type PostCardProps = {
  post: PostCardRecord;
  displayName?: string;
  profileHref?: string;
  showDelete?: boolean;
  showCommentCount?: boolean;
  likedByMe?: boolean;
  deleteDisabled?: boolean;
  onToggleLike: (post: PostCardRecord) => Promise<void>;
  onDelete?: (post: PostCardRecord) => Promise<void>;
};

export function PostCard({
  post,
  displayName,
  profileHref,
  showDelete = false,
  showCommentCount = true,
  likedByMe = false,
  deleteDisabled = false,
  onToggleLike,
  onDelete
}: PostCardProps) {
  return (
    <article className="space-y-2 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
      <header className="flex items-start justify-between gap-3">
        <div>
          {profileHref ? (
            <Link className="text-sm font-semibold" href={profileHref}>
              {displayName ?? `@${post.authorAddress}`}
            </Link>
          ) : (
            <p className="text-sm font-semibold">{displayName ?? `@${post.authorAddress}`}</p>
          )}
          <p className="text-xs text-stamp-ink/70">@{post.authorAddress}</p>
        </div>
        <p className="text-xs text-stamp-ink/60">{formatTimestamp(post.createdAt)}</p>
      </header>

      <p className="whitespace-pre-wrap text-sm text-stamp-ink">{post.content}</p>

      <footer className="flex items-center gap-2 text-sm">
        <Link className="rounded border border-stamp-muted px-3 py-1 hover:bg-stamp-muted" href={`/post/${post.id}`}>
          {showCommentCount ? `Comments (${Math.max(0, post.commentCount ?? 0)})` : "Comments"}
        </Link>
        <button
          className="rounded border border-stamp-muted px-3 py-1 hover:bg-stamp-muted"
          onClick={() => {
            void onToggleLike(post);
          }}
          type="button"
        >
          {likedByMe ? "Unlike" : "Like"} ({Math.max(0, post.likeCount)})
        </button>

        {showDelete && onDelete ? (
          <button
            className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
            disabled={deleteDisabled}
            onClick={() => {
              void onDelete(post);
            }}
            type="button"
          >
            {deleteDisabled ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </footer>
    </article>
  );
}
