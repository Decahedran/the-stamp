"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { CommentThread } from "@/components/posts/comment-thread";
import { PostCard } from "@/components/posts/post-card";
import { hasUserLikedPost, subscribeToPostById, toggleLike } from "@/lib/services/post-service";
import { getUserProfile } from "@/lib/services/profile-service";
import type { PostCardRecord } from "@/lib/types/db";

type PostDetailViewProps = {
  postId: string;
};

export function PostDetailView({ postId }: PostDetailViewProps) {
  const { user } = useAuth();

  const [post, setPost] = useState<PostCardRecord | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [likedByMe, setLikedByMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    return subscribeToPostById(postId, (nextPost) => {
      void (async () => {
        if (!nextPost) {
          setPost(null);
          setDisplayName(undefined);
          setLoading(false);
          return;
        }

        try {
          const [authorProfile, liked] = await Promise.all([
            getUserProfile(nextPost.authorUid),
            hasUserLikedPost(nextPost.id, user.uid)
          ]);

          setPost(nextPost);
          setDisplayName(authorProfile?.displayName);
          setLikedByMe(liked);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not load postcard.");
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [postId, user]);

  if (!user) {
    return null;
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Postcard</h1>
        <p className="text-sm text-stamp-ink/75">Direct link from notifications.</p>
      </header>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading postcard...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !post ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <p className="text-sm text-stamp-ink/75">This postcard is unavailable (deleted or missing).</p>
        </div>
      ) : null}

      {post ? (
        <>
          <PostCard
            displayName={displayName}
            likedByMe={likedByMe}
            onToggleLike={async (targetPost) => {
              const wasLiked = likedByMe;

              setLikedByMe(!wasLiked);
              setPost((previous) =>
                previous
                  ? {
                      ...previous,
                      likeCount: Math.max(0, previous.likeCount + (wasLiked ? -1 : 1))
                    }
                  : previous
              );

              try {
                await toggleLike(targetPost.id, user.uid);
              } catch (caught) {
                setLikedByMe(wasLiked);
                setPost((previous) =>
                  previous
                    ? {
                        ...previous,
                        likeCount: Math.max(0, previous.likeCount + (wasLiked ? 1 : -1))
                      }
                    : previous
                );
                setError(caught instanceof Error ? caught.message : "Could not update like.");
              }
            }}
            post={post}
          />
          <CommentThread post={post} />
        </>
      ) : null}

      <div className="flex gap-3 text-sm">
        <Link href="/notifications">Back to notifications</Link>
        {post ? <Link href={`/profile/${post.authorAddress}`}>View author profile</Link> : null}
      </div>
    </section>
  );
}
