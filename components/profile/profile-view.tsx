"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/layout/auth-provider";
import { PostCard } from "@/components/posts/post-card";
import { areFriends, removeFriend } from "@/lib/services/friendship-service";
import {
  deleteOwnPost,
  getActivePostCountByUid,
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
  const [friendshipStatus, setFriendshipStatus] = useState<"unknown" | "friend" | "not_friend">("unknown");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
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
        setFriendshipStatus("not_friend");
        return;
      }

      const [targetProfile, firstPage, activePostCount] = await Promise.all([
        getUserProfile(uid),
        getProfilePostsPageByUid(uid, { pageSize: PROFILE_POSTS_PAGE_SIZE }),
        getActivePostCountByUid(uid)
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

      const friendship = targetProfile.uid === user.uid ? false : await areFriends(user.uid, targetProfile.uid);

      setProfile({
        ...targetProfile,
        postCount: activePostCount
      });
      setPosts(firstPage.posts);
      setLikedByMe(Object.fromEntries(likePairs.map((item) => [item.postId, item.liked])));
      setNextCursor(firstPage.nextCursor);
      setHasMore(Boolean(firstPage.nextCursor));
      setFriendshipStatus(friendship ? "friend" : "not_friend");
      setRemoveConfirmOpen(false);
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

  async function handleRemoveFriend() {
    const currentUser = user;
    if (!currentUser || !profile || isOwnProfile || friendshipStatus !== "friend") {
      return;
    }

    setRemovingFriend(true);
    setError("");

    try {
      await removeFriend(currentUser.uid, profile.uid);
      setFriendshipStatus("not_friend");
      setRemoveConfirmOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove friend.");
    } finally {
      setRemovingFriend(false);
    }
  }

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

            {!isOwnProfile && friendshipStatus === "friend" ? (
              <div className="pt-1">
                {!removeConfirmOpen ? (
                  <button
                    className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setRemoveConfirmOpen(true);
                    }}
                    type="button"
                  >
                    Remove friend
                  </button>
                ) : (
                  <div className="space-y-2 rounded border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-800">Are you sure? This removes the friendship for both accounts.</p>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-red-300 px-3 py-1 text-xs text-red-800 hover:bg-red-100 disabled:opacity-60"
                        disabled={removingFriend}
                        onClick={() => {
                          void handleRemoveFriend();
                        }}
                        type="button"
                      >
                        {removingFriend ? "Removing..." : "Yes, remove"}
                      </button>
                      <button
                        className="rounded border border-stamp-muted bg-white px-3 py-1 text-xs hover:bg-stamp-muted"
                        disabled={removingFriend}
                        onClick={() => {
                          setRemoveConfirmOpen(false);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {!isOwnProfile && friendshipStatus === "not_friend" ? (
              <p className="text-xs text-stamp-ink/65">
                Not currently friends. <Link href="/friends">Go to Friends</Link> to connect.
              </p>
            ) : null}
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

                      setDeletingPostId(targetPost.id);
                      setError("");
                      setPosts((previous) => previous.filter((item) => item.id !== targetPost.id));
                      setProfile((previous) =>
                        previous
                          ? {
                              ...previous,
                              postCount: Math.max(0, previous.postCount - 1)
                            }
                          : previous
                      );
                      setLikedByMe((previous) => {
                        const next = { ...previous };
                        delete next[targetPost.id];
                        return next;
                      });

                      try {
                        await deleteOwnPost(targetPost.id, user.uid);
                      } catch (caught) {
                        setPosts(previousPosts);
                        setLikedByMe(previousLikedByMe);
                        setProfile(previousProfile);
                        setError(caught instanceof Error ? caught.message : "Could not delete postcard.");
                      } finally {
                        setDeletingPostId((previous) => (previous === targetPost.id ? null : previous));
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
                    deleteDisabled={deletingPostId === post.id}
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
