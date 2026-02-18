"use client";

import { useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/layout/auth-provider";
import { PostCard } from "@/components/posts/post-card";
import {
  deleteOwnPost,
  getProfilePostsPageByUid,
  hasUserLikedPost,
  toggleLike
} from "@/lib/services/post-service";
import { getUidByAddress, getUserProfile } from "@/lib/services/profile-service";
import type { PostCardRecord, UserProfile } from "@/lib/types/db";
import { PROFILE_POSTS_PAGE_SIZE } from "@/lib/utils/constants";

type ProfileViewProps = {
  address: string;
};

export function ProfileView({ address }: ProfileViewProps) {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostCardRecord[]>([]);
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function loadInitialProfile() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const uid = await getUidByAddress(address);
      if (!uid) {
        setProfile(null);
        setPosts([]);
        setLikedByMe({});
        setHasMore(false);
        setNextCursor(null);
        return;
      }

      const [targetProfile, firstPage] = await Promise.all([
        getUserProfile(uid),
        getProfilePostsPageByUid(uid, { pageSize: PROFILE_POSTS_PAGE_SIZE })
      ]);

      if (!targetProfile) {
        throw new Error("Profile not found.");
      }

      const likePairs = await Promise.all(
        firstPage.posts.map(async (post) => ({
          postId: post.id,
          liked: await hasUserLikedPost(post.id, user.uid)
        }))
      );

      setProfile(targetProfile);
      setPosts(firstPage.posts);
      setLikedByMe(Object.fromEntries(likePairs.map((item) => [item.postId, item.liked])));
      setNextCursor(firstPage.nextCursor);
      setHasMore(Boolean(firstPage.nextCursor));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMorePosts() {
    if (!profile || !user || !nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      const nextPage = await getProfilePostsPageByUid(profile.uid, {
        pageSize: PROFILE_POSTS_PAGE_SIZE,
        cursor: nextCursor
      });

      const likePairs = await Promise.all(
        nextPage.posts.map(async (post) => ({
          postId: post.id,
          liked: await hasUserLikedPost(post.id, user.uid)
        }))
      );

      setPosts((previous) => [...previous, ...nextPage.posts]);
      setLikedByMe((previous) => ({
        ...previous,
        ...Object.fromEntries(likePairs.map((item) => [item.postId, item.liked]))
      }));
      setNextCursor(nextPage.nextCursor);
      setHasMore(Boolean(nextPage.nextCursor));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadInitialProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, user?.uid]);

  if (!user) {
    return null;
  }

  const isOwnProfile = profile?.uid === user.uid;

  return (
    <section className="space-y-4">
      {loading ? <p className="text-sm text-stamp-ink/70">Loading profile...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !profile ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <h1 className="text-xl font-semibold">Profile not found</h1>
          <p className="text-sm text-stamp-ink/75">No user exists at @{address}.</p>
        </div>
      ) : null}

      {profile ? (
        <>
          <header className="space-y-2 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
            <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
            <p className="text-sm text-stamp-ink/75">@{profile.address}</p>
            <p className="text-sm text-stamp-ink/80">{profile.bio || "No bio yet."}</p>
            <div className="flex gap-4 text-xs text-stamp-ink/75">
              <span>Posts: {profile.postCount}</span>
              <span>Total likes: {profile.totalLikesReceived}</span>
            </div>
          </header>

          {posts.length === 0 ? (
            <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
              <p className="text-sm text-stamp-ink/75">No postcards yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard
                    displayName={profile.displayName}
                    key={post.id}
                    likedByMe={Boolean(likedByMe[post.id])}
                    onDelete={async (targetPost) => {
                      if (!isOwnProfile) {
                        return;
                      }

                      const previousPosts = posts;
                      const previousLikedByMe = likedByMe;
                      const previousProfile = profile;

                      setError("");
                      setPosts((previous) => previous.filter((item) => item.id !== targetPost.id));
                      setLikedByMe((previous) => {
                        const next = { ...previous };
                        delete next[targetPost.id];
                        return next;
                      });
                      setProfile((previous) =>
                        previous
                          ? {
                              ...previous,
                              postCount: Math.max(0, previous.postCount - 1),
                              totalLikesReceived: Math.max(0, previous.totalLikesReceived - targetPost.likeCount)
                            }
                          : previous
                      );

                      try {
                        await deleteOwnPost(targetPost.id, user.uid);
                      } catch (caught) {
                        setPosts(previousPosts);
                        setLikedByMe(previousLikedByMe);
                        setProfile(previousProfile);
                        setError(caught instanceof Error ? caught.message : "Could not delete postcard.");
                      }
                    }}
                    onToggleLike={async (targetPost) => {
                      const wasLiked = Boolean(likedByMe[targetPost.id]);

                      setLikedByMe((previous) => ({
                        ...previous,
                        [targetPost.id]: !wasLiked
                      }));
                      setPosts((previous) =>
                        previous.map((post) =>
                          post.id === targetPost.id
                            ? {
                                ...post,
                                likeCount: Math.max(0, post.likeCount + (wasLiked ? -1 : 1))
                              }
                            : post
                        )
                      );

                      try {
                        await toggleLike(targetPost.id, user.uid);
                      } catch (caught) {
                        setLikedByMe((previous) => ({
                          ...previous,
                          [targetPost.id]: wasLiked
                        }));
                        setPosts((previous) =>
                          previous.map((post) =>
                            post.id === targetPost.id
                              ? {
                                  ...post,
                                  likeCount: Math.max(0, post.likeCount + (wasLiked ? 1 : -1))
                                }
                              : post
                          )
                        );
                        setError(caught instanceof Error ? caught.message : "Could not update like.");
                      }
                    }}
                    post={post}
                    showDelete={isOwnProfile}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="flex justify-center">
                  <button
                    className="rounded border border-stamp-muted px-4 py-2 text-sm hover:bg-stamp-muted disabled:opacity-60"
                    disabled={loadingMore}
                    onClick={() => {
                      void loadMorePosts();
                    }}
                    type="button"
                  >
                    {loadingMore ? "Loading more..." : "Load more postcards"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
