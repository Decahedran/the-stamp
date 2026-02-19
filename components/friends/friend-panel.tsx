"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  acceptFriendRequest,
  areFriends,
  hasPendingRequestBetween,
  sendFriendRequest,
  subscribeToFriendIds,
  subscribeToIncomingFriendRequests
} from "@/lib/services/friendship-service";
import { getUidByAddress, getUserProfile } from "@/lib/services/profile-service";

type FriendSummary = {
  uid: string;
  address: string;
  displayName: string;
};

type IncomingSummary = {
  id: string;
  fromUid: string;
  fromAddress: string;
  fromDisplayName: string;
};

type FriendPanelProps = {
  currentUid: string;
  onChanged: () => Promise<void>;
};

export function FriendPanel({ currentUid, onChanged }: FriendPanelProps) {
  const [searchAddress, setSearchAddress] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [incoming, setIncoming] = useState<IncomingSummary[]>([]);

  const normalizedAddress = useMemo(
    () => searchAddress.trim().toLowerCase().replace(/^@+/, ""),
    [searchAddress]
  );

  useEffect(() => {
    return subscribeToFriendIds(currentUid, (friendIds) => {
      void (async () => {
        const friendProfiles = await Promise.all(friendIds.map((uid) => getUserProfile(uid)));

        setFriends(
          friendProfiles
            .filter((value): value is NonNullable<typeof value> => Boolean(value))
            .map((profile) => ({ uid: profile.uid, address: profile.address, displayName: profile.displayName }))
        );
      })();
    });
  }, [currentUid]);

  useEffect(() => {
    return subscribeToIncomingFriendRequests(currentUid, (incomingRequests) => {
      void (async () => {
        const senderProfiles = await Promise.all(incomingRequests.map((request) => getUserProfile(request.fromUid)));

        setIncoming(
          incomingRequests.map((request, index) => ({
            id: request.id,
            fromUid: request.fromUid,
            fromAddress: senderProfiles[index]?.address ?? "unknown",
            fromDisplayName: senderProfiles[index]?.displayName ?? "Unknown"
          }))
        );
      })();
    });
  }, [currentUid]);

  async function handleSendRequest() {
    setNotice("");
    setLoading(true);

    try {
      if (!normalizedAddress) {
        throw new Error("Enter an @ddress first.");
      }

      const targetUid = await getUidByAddress(normalizedAddress);
      if (!targetUid) {
        throw new Error("No user found with that @ddress.");
      }

      if (targetUid === currentUid) {
        throw new Error("You can’t friend yourself. Even if you’re amazing.");
      }

      const [alreadyFriends, pending] = await Promise.all([
        areFriends(currentUid, targetUid),
        hasPendingRequestBetween(currentUid, targetUid)
      ]);

      if (alreadyFriends) {
        throw new Error("You’re already friends.");
      }

      if (pending) {
        throw new Error("Friend request already pending.");
      }

      setSearchAddress("");
      setNotice("Sending friend request...");

      await sendFriendRequest(targetUid);
      setNotice("Friend request sent.");
    } catch (caught) {
      if (caught instanceof Error) {
        setNotice(caught.message);
      } else {
        setNotice("Could not send friend request.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId: string, fromUid: string) {
    setLoading(true);
    setNotice("");

    const acceptedRequest = incoming.find((item) => item.id === requestId);
    if (!acceptedRequest) {
      setLoading(false);
      return;
    }

    setIncoming((previous) => previous.filter((item) => item.id !== requestId));
    setFriends((previous) => {
      if (previous.some((item) => item.uid === fromUid)) {
        return previous;
      }

      return [
        ...previous,
        {
          uid: fromUid,
          address: acceptedRequest.fromAddress,
          displayName: acceptedRequest.fromDisplayName
        }
      ];
    });

    try {
      await acceptFriendRequest(requestId, fromUid, currentUid);
      setNotice("Friend request accepted.");
      await onChanged();
    } catch (caught) {
      setIncoming((previous) => [acceptedRequest, ...previous]);
      setFriends((previous) => previous.filter((item) => item.uid !== fromUid));
      setNotice(caught instanceof Error ? caught.message : "Could not accept request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Friends</h2>
        <p className="text-xs text-stamp-ink/70">
          Add by @ddress, accept requests, and tap a friend to view their profile.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          className="w-full rounded border border-stamp-muted px-3 py-2 text-sm"
          onChange={(event) => setSearchAddress(event.target.value)}
          placeholder="find by @ddress"
          value={searchAddress}
        />
        <button
          className="rounded border border-stamp-muted px-3 py-2 text-sm hover:bg-stamp-muted disabled:opacity-60"
          disabled={loading}
          onClick={() => {
            void handleSendRequest();
          }}
          type="button"
        >
          Add
        </button>
      </div>

      {notice ? <p className="text-xs text-stamp-accent">{notice}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Incoming requests</h3>
        {incoming.length === 0 ? (
          <p className="text-xs text-stamp-ink/65">No pending requests.</p>
        ) : (
          incoming.map((request) => (
            <div className="flex items-center justify-between rounded border border-stamp-muted p-2 text-sm" key={request.id}>
              <span>
                {request.fromDisplayName} (@{request.fromAddress})
              </span>
              <button
                className="rounded border border-stamp-muted px-2 py-1 text-xs hover:bg-stamp-muted"
                onClick={() => {
                  void handleAccept(request.id, request.fromUid);
                }}
                type="button"
              >
                Accept
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Your friends</h3>
        {friends.length === 0 ? (
          <p className="text-xs text-stamp-ink/65">No friends yet. Add someone to populate your feed.</p>
        ) : (
          friends.map((friend) => (
            <Link
              className="block rounded border border-stamp-muted p-2 text-sm hover:bg-stamp-muted"
              href={`/profile/${friend.address}`}
              key={friend.uid}
            >
              {friend.displayName} (@{friend.address})
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
