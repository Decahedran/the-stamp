import {
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ADDRESS_CHANGE_COOLDOWN_DAYS } from "@/lib/utils/constants";
import { normalizeAddress } from "@/lib/utils/address";
import type { UserProfile } from "@/lib/types/db";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserProfile;
}

export async function getUidByAddress(address: string): Promise<string | null> {
  const normalized = normalizeAddress(address);
  const snapshot = await getDoc(doc(db, "addresses", normalized));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return (data.uid as string | undefined) ?? null;
}

export async function getUserProfileByAddress(address: string): Promise<UserProfile | null> {
  const uid = await getUidByAddress(address);
  if (!uid) {
    return null;
  }
  return getUserProfile(uid);
}

export async function isAddressAvailable(address: string): Promise<boolean> {
  const normalized = normalizeAddress(address);
  const snapshot = await getDoc(doc(db, "addresses", normalized));
  return !snapshot.exists();
}

export async function createInitialUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  address: string;
}) {
  const normalized = normalizeAddress(params.address);

  await runTransaction(db, async (tx) => {
    const addressRef = doc(db, "addresses", normalized);
    const existingAddress = await tx.get(addressRef);

    if (existingAddress.exists()) {
      throw new Error("Address is already taken");
    }

    const userRef = doc(db, "users", params.uid);

    tx.set(userRef, {
      uid: params.uid,
      email: params.email,
      displayName: params.displayName,
      address: normalized,
      bio: "",
      photoUrl: "",
      backgroundUrl: "",
      postCount: 0,
      totalLikesReceived: 0,
      addressLastChangedAt: null,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    tx.set(addressRef, {
      uid: params.uid,
      createdAt: serverTimestamp()
    });
  });
}

export async function canChangeAddress(lastChangedAt: Timestamp | null): Promise<boolean> {
  if (!lastChangedAt) {
    return true;
  }

  const earliestNextChange =
    lastChangedAt.toDate().getTime() + ADDRESS_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  return Date.now() >= earliestNextChange;
}

export function getNextAddressChangeDate(lastChangedAt: Timestamp | null): Date | null {
  if (!lastChangedAt) {
    return null;
  }

  return new Date(
    lastChangedAt.toDate().getTime() + ADDRESS_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );
}

export async function updateAddress(uid: string, requestedAddress: string) {
  const normalized = normalizeAddress(requestedAddress);

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", uid);
    const userSnapshot = await tx.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("User profile not found");
    }

    const user = userSnapshot.data() as UserProfile;
    const currentAddress = normalizeAddress(user.address);

    if (currentAddress === normalized) {
      return;
    }

    const allowed = await canChangeAddress(user.addressLastChangedAt);
    if (!allowed) {
      const nextDate = getNextAddressChangeDate(user.addressLastChangedAt);
      throw new Error(
        `You can only change your @ddress once per week. Next change: ${nextDate?.toLocaleString()}`
      );
    }

    const newAddressRef = doc(db, "addresses", normalized);
    const newAddressSnapshot = await tx.get(newAddressRef);

    if (newAddressSnapshot.exists()) {
      throw new Error("That @ddress is already taken");
    }

    const oldAddressRef = doc(db, "addresses", currentAddress);

    tx.set(newAddressRef, {
      uid,
      createdAt: serverTimestamp()
    });

    tx.update(userRef, {
      address: normalized,
      addressLastChangedAt: Timestamp.now(),
      updatedAt: serverTimestamp()
    });

    tx.delete(oldAddressRef);
  });
}

export async function updateProfileFields(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "bio" | "photoUrl" | "backgroundUrl">>
) {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
}
