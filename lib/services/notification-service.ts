import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import type { NotificationItem, WithId } from "@/lib/types/db";
import { db } from "@/lib/firebase/client";

async function createNotification(params: {
  recipientUid: string;
  actorUid: string;
  type: NotificationItem["type"];
  postId?: string;
}) {
  if (params.recipientUid === params.actorUid) {
    return;
  }

  await addDoc(collection(db, "notifications"), {
    recipientUid: params.recipientUid,
    actorUid: params.actorUid,
    postId: params.postId ?? "",
    type: params.type,
    read: false,
    createdAt: serverTimestamp()
  });
}

export async function createPostLikedNotification(params: {
  recipientUid: string;
  actorUid: string;
  postId: string;
}) {
  await createNotification({
    recipientUid: params.recipientUid,
    actorUid: params.actorUid,
    type: "post_liked",
    postId: params.postId
  });
}

export async function createFriendRequestReceivedNotification(params: {
  recipientUid: string;
  actorUid: string;
}) {
  await createNotification({
    recipientUid: params.recipientUid,
    actorUid: params.actorUid,
    type: "friend_request_received"
  });
}

export async function createFriendRequestAcceptedNotification(params: {
  recipientUid: string;
  actorUid: string;
}) {
  await createNotification({
    recipientUid: params.recipientUid,
    actorUid: params.actorUid,
    type: "friend_request_accepted"
  });
}

export async function getNotificationsForUser(uid: string): Promise<WithId<NotificationItem>[]> {
  const snapshots = await getDocs(
    query(collection(db, "notifications"), where("recipientUid", "==", uid), orderBy("createdAt", "desc"))
  );

  return snapshots.docs.map((snapshot) => ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<WithId<NotificationItem>, "id">)
  }));
}

export function subscribeToNotificationsForUser(
  uid: string,
  onChange: (items: WithId<NotificationItem>[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "notifications"), where("recipientUid", "==", uid), orderBy("createdAt", "desc")),
    (snapshots) => {
      onChange(
        snapshots.docs.map((snapshot) => ({
          id: snapshot.id,
          ...(snapshot.data() as Omit<WithId<NotificationItem>, "id">)
        }))
      );
    }
  );
}

export async function getUnreadNotificationCount(uid: string): Promise<number> {
  const snapshots = await getDocs(
    query(collection(db, "notifications"), where("recipientUid", "==", uid), where("read", "==", false))
  );

  return snapshots.size;
}

export function subscribeToUnreadNotificationCount(
  uid: string,
  onChange: (count: number) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "notifications"), where("recipientUid", "==", uid), where("read", "==", false)),
    (snapshots) => {
      onChange(snapshots.size);
    }
  );
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true
  });
}
