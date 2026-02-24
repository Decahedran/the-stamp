import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import type {
  ModerationAction,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  SafetyReport,
  SafetyReportRecord,
  UserSafetyStatus
} from "@/lib/types/db";
import { REPORT_AUTO_ESCALATE_THRESHOLD, SAFETY_MUTE_DEFAULT_MINUTES } from "@/lib/utils/constants";

const REPORT_RATE_LIMIT_SECONDS = 30;

function isRecentTimestamp(timestamp: Timestamp | null | undefined, windowSeconds: number): boolean {
  if (!timestamp) {
    return false;
  }

  return Date.now() - timestamp.toDate().getTime() < windowSeconds * 1000;
}

async function countUnresolvedReportsForTarget(targetType: ReportTargetType, targetId: string): Promise<number> {
  const [openSnapshots, escalatedSnapshots] = await Promise.all([
    getDocs(
      query(
        collection(db, "reports"),
        where("targetType", "==", targetType),
        where("targetId", "==", targetId),
        where("status", "==", "open")
      )
    ),
    getDocs(
      query(
        collection(db, "reports"),
        where("targetType", "==", targetType),
        where("targetId", "==", targetId),
        where("status", "==", "escalated")
      )
    )
  ]);

  return openSnapshots.size + escalatedSnapshots.size;
}

async function hasDuplicateOpenReport(params: {
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
}): Promise<boolean> {
  const [openSnapshots, escalatedSnapshots] = await Promise.all([
    getDocs(
      query(
        collection(db, "reports"),
        where("reporterUid", "==", params.reporterUid),
        where("targetType", "==", params.targetType),
        where("targetId", "==", params.targetId),
        where("status", "==", "open"),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "reports"),
        where("reporterUid", "==", params.reporterUid),
        where("targetType", "==", params.targetType),
        where("targetId", "==", params.targetId),
        where("status", "==", "escalated"),
        limit(1)
      )
    )
  ]);

  return !openSnapshots.empty || !escalatedSnapshots.empty;
}

export async function reportContent(params: {
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid: string;
  reason: ReportReason;
  details?: string;
}) {
  const isDuplicate = await hasDuplicateOpenReport({
    reporterUid: params.reporterUid,
    targetType: params.targetType,
    targetId: params.targetId
  });

  if (isDuplicate) {
    throw new Error("You already have an open report for this content.");
  }

  const recentReportSnapshots = await getDocs(
    query(collection(db, "reports"), where("reporterUid", "==", params.reporterUid), orderBy("createdAt", "desc"), limit(1))
  );

  const lastReportCreatedAt = recentReportSnapshots.empty
    ? null
    : (recentReportSnapshots.docs[0].data().createdAt as Timestamp | null | undefined);

  if (isRecentTimestamp(lastReportCreatedAt, REPORT_RATE_LIMIT_SECONDS)) {
    throw new Error("Please wait a few seconds before submitting another report.");
  }

  const unresolvedCount = await countUnresolvedReportsForTarget(params.targetType, params.targetId);
  const escalationCount = unresolvedCount + 1;
  const flaggedForReview = escalationCount >= REPORT_AUTO_ESCALATE_THRESHOLD;

  await addDoc(collection(db, "reports"), {
    reporterUid: params.reporterUid,
    targetType: params.targetType,
    targetId: params.targetId,
    targetOwnerUid: params.targetOwnerUid,
    reason: params.reason,
    details: params.details?.trim() ?? "",
    status: flaggedForReview ? "escalated" : "open",
    reviewedByUid: "",
    reviewedAt: null,
    reviewNotes: "",
    escalationCount,
    flaggedForReview,
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
  return subscribeToUnresolvedReports(onChange);
}

export function subscribeToUnresolvedReports(onChange: (reports: SafetyReportRecord[]) => void): Unsubscribe {
  let openReports: SafetyReportRecord[] = [];
  let escalatedReports: SafetyReportRecord[] = [];

  function emit() {
    const merged = [...openReports, ...escalatedReports].sort(
      (a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
    );
    onChange(merged.slice(0, 300));
  }

  const unsubOpen = onSnapshot(
    query(collection(db, "reports"), where("status", "==", "open"), orderBy("createdAt", "desc"), limit(200)),
    (snapshots) => {
      openReports = snapshots.docs.map((snapshot) => ({
        id: snapshot.id,
        ...(snapshot.data() as Omit<SafetyReport, "id">)
      }));
      emit();
    }
  );

  const unsubEscalated = onSnapshot(
    query(collection(db, "reports"), where("status", "==", "escalated"), orderBy("createdAt", "desc"), limit(200)),
    (snapshots) => {
      escalatedReports = snapshots.docs.map((snapshot) => ({
        id: snapshot.id,
        ...(snapshot.data() as Omit<SafetyReport, "id">)
      }));
      emit();
    }
  );

  return () => {
    unsubOpen();
    unsubEscalated();
  };
}

export function subscribeToModerationInboxCount(onChange: (count: number) => void): Unsubscribe {
  let openCount = 0;
  let escalatedCount = 0;

  const emit = () => onChange(openCount + escalatedCount);

  const unsubOpen = onSnapshot(query(collection(db, "reports"), where("status", "==", "open"), limit(500)), (snapshots) => {
    openCount = snapshots.size;
    emit();
  });

  const unsubEscalated = onSnapshot(
    query(collection(db, "reports"), where("status", "==", "escalated"), limit(500)),
    (snapshots) => {
      escalatedCount = snapshots.size;
      emit();
    }
  );

  return () => {
    unsubOpen();
    unsubEscalated();
  };
}

export async function updateReportStatus(params: {
  reportId: string;
  reviewerUid: string;
  status: Exclude<ReportStatus, "open" | "escalated">;
  reviewNotes?: string;
}) {
  await updateDoc(doc(db, "reports", params.reportId), {
    status: params.status,
    reviewedByUid: params.reviewerUid,
    reviewedAt: serverTimestamp(),
    reviewNotes: params.reviewNotes?.trim() ?? "",
    updatedAt: serverTimestamp()
  });

  await addModerationAction({
    reportId: params.reportId,
    action: params.status,
    actorUid: params.reviewerUid,
    notes: params.reviewNotes?.trim() ?? ""
  });
}

async function addModerationAction(params: {
  reportId: string;
  action: "escalated" | "resolved" | "dismissed" | "muted_user";
  actorUid: string;
  notes: string;
}) {
  const reportSnapshot = await getDoc(doc(db, "reports", params.reportId));
  if (!reportSnapshot.exists()) {
    return;
  }

  const report = reportSnapshot.data() as SafetyReport;

  const payload: Omit<ModerationAction, "createdAt"> & { createdAt: unknown } = {
    reportId: params.reportId,
    targetType: report.targetType,
    targetId: report.targetId,
    targetOwnerUid: report.targetOwnerUid,
    action: params.action,
    actorUid: params.actorUid,
    notes: params.notes,
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "moderationActions"), payload);
}

export async function muteUser(params: { uid: string; moderatorUid: string; reason?: string; minutes?: number }) {
  const minutes = Math.max(1, params.minutes ?? SAFETY_MUTE_DEFAULT_MINUTES);
  const mutedUntil = Timestamp.fromMillis(Date.now() + minutes * 60 * 1000);

  await setDoc(doc(db, "userSafety", params.uid), {
    uid: params.uid,
    mutedUntil,
    muteReason: params.reason?.trim() ?? "Muted by moderator",
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "moderationActions"), {
    reportId: "",
    targetType: "profile",
    targetId: params.uid,
    targetOwnerUid: params.uid,
    action: "muted_user",
    actorUid: params.moderatorUid,
    notes: params.reason?.trim() ?? "Muted by moderator",
    createdAt: serverTimestamp()
  });
}

export async function getUserSafetyStatus(uid: string): Promise<UserSafetyStatus | null> {
  const snapshot = await getDoc(doc(db, "userSafety", uid));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserSafetyStatus;
}

export function subscribeToUserSafetyStatus(uid: string, onChange: (status: UserSafetyStatus | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "userSafety", uid), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }

    onChange(snapshot.data() as UserSafetyStatus);
  });
}

export async function isUserMuted(uid: string): Promise<boolean> {
  const status = await getUserSafetyStatus(uid);
  if (!status?.mutedUntil) {
    return false;
  }

  return status.mutedUntil.toDate().getTime() > Date.now();
}
