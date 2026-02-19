import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import type { FriendRequestRecord } from "@/lib/types/db";
import { auth, db } from "@/lib/firebase/client";

function createFriendshipId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export async function sendFriendRequest(toUid: string) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("You must be signed in to send a friend request");
  }

  if (currentUid === toUid) {
    throw new Error("You cannot friend yourself");
  }

  const requestRef = doc(collection(db, "friendRequests"));
  await setDoc(requestRef, {
    fromUid: currentUid,
    toUid,
    status: "pending",
    createdAt: serverTimestamp(),
    respondedAt: null
  });
}

export async function acceptFriendRequest(requestId: string, fromUid: string, toUid: string) {
  const friendshipId = createFriendshipId(fromUid, toUid);

  await Promise.all([
    updateDoc(doc(db, "friendRequests", requestId), {
      status: "accepted",
      respondedAt: serverTimestamp()
    }),
    setDoc(doc(db, "friendships", friendshipId), {
      users: [fromUid, toUid].sort(),
      createdAt: serverTimestamp()
    })
  ]);
}

export async function removeFriend(uidA: string, uidB: string) {
  const friendshipId = createFriendshipId(uidA, uidB);
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export async function areFriends(uidA: string, uidB: string): Promise<boolean> {
  const snapshots = await getDocs(
    query(collection(db, "friendships"), where("users", "array-contains", uidA))
  );

  return snapshots.docs.some((snapshot) => {
    const users = snapshot.data().users as string[];
    return users.includes(uidB);
  });
}

export async function getFriendIds(uid: string): Promise<string[]> {
  const friendshipQuery = query(collection(db, "friendships"), where("users", "array-contains", uid));
  const snapshots = await getDocs(friendshipQuery);

  const friendIds = new Set<string>();

  snapshots.forEach((snapshot) => {
    const users = snapshot.data().users as string[];
    users.forEach((value) => {
      if (value !== uid) {
        friendIds.add(value);
      }
    });
  });

  return [...friendIds];
}

export function subscribeToFriendIds(uid: string, onChange: (friendIds: string[]) => void): Unsubscribe {
  const friendshipQuery = query(collection(db, "friendships"), where("users", "array-contains", uid));

  return onSnapshot(friendshipQuery, (snapshots) => {
    const friendIds = new Set<string>();

    snapshots.forEach((snapshot) => {
      const users = snapshot.data().users as string[];
      users.forEach((value) => {
        if (value !== uid) {
          friendIds.add(value);
        }
      });
    });

    onChange([...friendIds]);
  });
}

export async function hasPendingRequestBetween(uidA: string, uidB: string): Promise<boolean> {
  const [forward, reverse] = await Promise.all([
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("status", "==", "pending"),
        where("fromUid", "==", uidA),
        where("toUid", "==", uidB)
      )
    ),
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("status", "==", "pending"),
        where("fromUid", "==", uidB),
        where("toUid", "==", uidA)
      )
    )
  ]);

  return !forward.empty || !reverse.empty;
}

export async function getIncomingFriendRequests(uid: string): Promise<FriendRequestRecord[]> {
  const snapshots = await getDocs(
    query(
      collection(db, "friendRequests"),
      where("status", "==", "pending"),
      where("toUid", "==", uid)
    )
  );

  return snapshots.docs.map((snapshot) => ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<FriendRequestRecord, "id">)
  }));
}

export function subscribeToIncomingFriendRequests(
  uid: string,
  onChange: (requests: FriendRequestRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "friendRequests"),
      where("status", "==", "pending"),
      where("toUid", "==", uid)
    ),
    (snapshots) => {
      onChange(
        snapshots.docs.map((snapshot) => ({
          id: snapshot.id,
          ...(snapshot.data() as Omit<FriendRequestRecord, "id">)
        }))
      );
    }
  );
}
