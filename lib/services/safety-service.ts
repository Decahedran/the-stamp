import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ReportReason, ReportStatus, ReportTargetType, SafetyReport, SafetyReportRecord } from "@/lib/types/db";

export async function reportContent(params: {
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid: string;
  reason: ReportReason;
  details?: string;
}) {
  await addDoc(collection(db, "reports"), {
    reporterUid: params.reporterUid,
    targetType: params.targetType,
    targetId: params.targetId,
    targetOwnerUid: params.targetOwnerUid,
    reason: params.reason,
    details: params.details?.trim() ?? "",
    status: "open",
    reviewedByUid: "",
    reviewedAt: null,
    reviewNotes: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function blockDocId(blockerUid: string, blockedUid: string): string {
  return `${blockerUid}_${blockedUid}`;
}

export async function blockUser(blockerUid: string, blockedUid: string) {
  if (blockerUid === blockedUid) {
    throw new Error("You cannot block yourself.");
  }

  await setDoc(doc(db, "userBlocks", blockDocId(blockerUid, blockedUid)), {
    blockerUid,
    blockedUid,
    createdAt: serverTimestamp()
  });
}

export async function unblockUser(blockerUid: string, blockedUid: string) {
  await deleteDoc(doc(db, "userBlocks", blockDocId(blockerUid, blockedUid)));
}

export async function isBlockedEitherDirection(uidA: string, uidB: string): Promise<boolean> {
  const [forward, reverse] = await Promise.all([
    getDocs(query(collection(db, "userBlocks"), where("blockerUid", "==", uidA), where("blockedUid", "==", uidB), limit(1))),
    getDocs(query(collection(db, "userBlocks"), where("blockerUid", "==", uidB), where("blockedUid", "==", uidA), limit(1)))
  ]);

  return !forward.empty || !reverse.empty;
}

export async function getBlockedUserIds(uid: string): Promise<string[]> {
  const [iBlockedSnapshots, blockedMeSnapshots] = await Promise.all([
    getDocs(query(collection(db, "userBlocks"), where("blockerUid", "==", uid))),
    getDocs(query(collection(db, "userBlocks"), where("blockedUid", "==", uid)))
  ]);

  const blocked = iBlockedSnapshots.docs.map((snapshot) => snapshot.data().blockedUid as string);
  const blockedMe = blockedMeSnapshots.docs.map((snapshot) => snapshot.data().blockerUid as string);

  return [...new Set([...blocked, ...blockedMe].filter((value) => Boolean(value)))];
}

export function subscribeToBlockedUserIds(uid: string, onChange: (blockedIds: string[]) => void): Unsubscribe {
  let mine: string[] = [];
  let theirs: string[] = [];

  function emit() {
    onChange([...new Set([...mine, ...theirs])]);
  }

  const unsubMine = onSnapshot(query(collection(db, "userBlocks"), where("blockerUid", "==", uid)), (snapshots) => {
    mine = snapshots.docs.map((snapshot) => snapshot.data().blockedUid as string).filter((value) => Boolean(value));
    emit();
  });

  const unsubTheirs = onSnapshot(
    query(collection(db, "userBlocks"), where("blockedUid", "==", uid)),
    (snapshots) => {
      theirs = snapshots.docs
        .map((snapshot) => snapshot.data().blockerUid as string)
        .filter((value) => Boolean(value));
      emit();
    }
  );

  return () => {
    unsubMine();
    unsubTheirs();
  };
}

export function subscribeToOpenReports(onChange: (reports: SafetyReportRecord[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "reports"), where("status", "==", "open"), orderBy("createdAt", "desc"), limit(200)),
    (snapshots) => {
      onChange(
        snapshots.docs.map((snapshot) => ({
          id: snapshot.id,
          ...(snapshot.data() as Omit<SafetyReport, "id">)
        }))
      );
    }
  );
}

export async function updateReportStatus(params: {
  reportId: string;
  reviewerUid: string;
  status: Exclude<ReportStatus, "open">;
  reviewNotes?: string;
}) {
  await updateDoc(doc(db, "reports", params.reportId), {
    status: params.status,
    reviewedByUid: params.reviewerUid,
    reviewedAt: serverTimestamp(),
    reviewNotes: params.reviewNotes?.trim() ?? "",
    updatedAt: serverTimestamp()
  });
}
