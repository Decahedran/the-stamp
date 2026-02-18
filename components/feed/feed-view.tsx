"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { FriendPanel } from "@/components/friends/friend-panel";
import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { subscribeToFriendIds } from "@/lib/services/friendship-service";
import { hasUserLikedPost, subscribeToRecentPosts, toggleLike } from "@/lib/services/post-service";
import { getUserProfile } from "@/lib/services/profile-service";
import type { PostCardRecord, UserProfile } from "@/lib/types/db";
import { FEED_WINDOW_HOURS } from "@/lib/utils/constants";

export function FeedView() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostCardRecord[]>([]);
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [authorDisplayNames, setAuthorDisplayNames] = useState<Record<string, string>>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [friendsReady, setFriendsReady] = useState(false);
  const [postsReady, setPostsReady] = useState(false);
  const [error, setError] = useState("");

  const loading = profileLoading || !friendsReady || !postsReady;

  const ownProfileLink = useMemo(() => {
    if (!profile) {
      return "/settings/profile";
    }
    return `/profile/${profile.address}`;
  }, [profile]);

  const posts = useMemo(() => {
    if (!user) {
      return [];
    }

    const visibleUids = new Set([user.uid, ...friendIds]);
    const cutoff = Date.now() - FEED_WINDOW_HOURS * 60 * 60 * 1000;

    return recentPosts.filter(
      (post) => visibleUids.has(post.authorUid) && post.createdAt.toDate().getTime() >= cutoff
    );
  }, [friendIds, recentPosts, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileLoading(true);
    setError("");

    void (async () => {
      try {
        const currentProfile = await getUserProfile(user.uid);
        if (!currentProfile) {
          throw new Error("Could not find your profile. Try signing out and back in.");
        }

        setProfile(currentProfile);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load your profile.");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToFriendIds(user.uid, (nextFriendIds) => {
      setFriendIds(nextFriendIds);
      setFriendsReady(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToRecentPosts((nextPosts) => {
      setRecentPosts(nextPosts);
      setPostsReady(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (posts.length === 0) {
      setLikedByMe({});
      setAuthorDisplayNames({});
      return;
    }

    void (async () => {
      try {
        const [likePairs, authorProfiles] = await Promise.all([
          Promise.all(
            posts.map(async (post) => ({
              postId: post.id,
              liked: await hasUserLikedPost(post.id, user.uid)
            }))
          ),
          Promise.all(
            [...new Set(posts.map((post) => post.authorUid))].map(async (authorUid) => {
              const authorProfile = await getUserProfile(authorUid);
              return {
                authorUid,
                displayName: authorProfile?.displayName ?? ""
              };
            })
          )
        ]);

        setLikedByMe(Object.fromEntries(likePairs.map((item) => [item.postId, item.liked])));
        setAuthorDisplayNames(
          Object.fromEntries(
            authorProfiles.filter((item) => item.displayName).map((item) => [item.authorUid, item.displayName])
          )
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not hydrate feed metadata.");
      }
    })();
  }, [posts, user]);

  if (!user) {
    return null;
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="text-sm text-stamp-ink/75">
          Last 24 hours. Friends + you. Newest first, like civilized postcard people.
        </p>
        <p className="mt-2 text-sm">
          <Link href={ownProfileLink}>Go to your profile</Link>
        </p>
      </header>

      {profile ? (
        <PostComposer
          authorAddress={profile.address}
          authorUid={user.uid}
          onPosted={async () => {
            // realtime listener handles insertion; intentionally no-op
          }}
        />
      ) : null}

      <FriendPanel
        currentUid={user.uid}
        onChanged={async () => {
          // realtime listeners handle state updates; intentionally no-op
        }}
      />

      {loading ? <p className="text-sm text-stamp-ink/70">Loading feed postcards...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && posts.length === 0 ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <p className="text-sm text-stamp-ink/80">No postcards in the last 24 hours yet.</p>
          <p className="text-xs text-stamp-ink/65">Try posting one or adding friends.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            displayName={authorDisplayNames[post.authorUid]}
            key={post.id}
            likedByMe={Boolean(likedByMe[post.id])}
            onToggleLike={async (targetPost) => {
              const wasLiked = Boolean(likedByMe[targetPost.id]);

              setLikedByMe((previous) => ({
                ...previous,
                [targetPost.id]: !wasLiked
              }));
              setRecentPosts((previous) =>
                previous.map((item) =>
                  item.id === targetPost.id
                    ? {
                        ...item,
                        likeCount: Math.max(0, item.likeCount + (wasLiked ? -1 : 1))
                      }
                    : item
                )
              );

              try {
                await toggleLike(targetPost.id, user.uid);
              } catch (caught) {
                setLikedByMe((previous) => ({
                  ...previous,
                  [targetPost.id]: wasLiked
                }));
                setRecentPosts((previous) =>
                  previous.map((item) =>
                    item.id === targetPost.id
                      ? {
                          ...item,
                          likeCount: Math.max(0, item.likeCount + (wasLiked ? 1 : -1))
                        }
                      : item
                  )
                );
                setError(caught instanceof Error ? caught.message : "Could not update like.");
              }
            }}
            post={post}
          />
        ))}
      </div>
    </section>
  );
}
