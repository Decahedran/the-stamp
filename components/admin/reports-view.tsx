"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { getUserProfile } from "@/lib/services/profile-service";
import { muteUser, subscribeToUnresolvedReports, updateReportStatus } from "@/lib/services/safety-service";
import type { ReportReason, SafetyReportRecord } from "@/lib/types/db";
import { ADMIN_UIDS, SAFETY_MUTE_DEFAULT_MINUTES } from "@/lib/utils/constants";
import { formatTimestamp } from "@/lib/utils/dates";

const REASON_FILTERS: Array<{ value: "all" | ReportReason; label: string }> = [
  { value: "all", label: "All reasons" },
  { value: "bullying_harassment", label: "Bullying/harassment" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence_threats", label: "Violence/threats" },
  { value: "self_harm", label: "Self-harm" },
  { value: "hate_abuse", label: "Hate/abuse" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" }
];

const TIMEFRAME_FILTERS = [
  { value: "24h", label: "Last 24h", hours: 24 },
  { value: "7d", label: "Last 7d", hours: 24 * 7 },
  { value: "30d", label: "Last 30d", hours: 24 * 30 },
  { value: "all", label: "All time", hours: null }
] as const;

export function ReportsView() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReportRecord[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>({});
  const [muteMinutesById, setMuteMinutesById] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<(typeof REASON_FILTERS)[number]["value"]>("all");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAME_FILTERS)[number]["value"]>("7d");

  const isAdmin = useMemo(() => Boolean(user && ADMIN_UIDS.includes(user.uid)), [user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    return subscribeToUnresolvedReports((items) => {
      setReports(items);
      setLoading(false);
    });
  }, [isAdmin, user]);

  useEffect(() => {
    if (!reports.length) {
      setActorNames({});
      return;
    }

    void (async () => {
      const uniqueUids = [...new Set(reports.flatMap((report) => [report.reporterUid, report.targetOwnerUid, report.reviewedByUid]))]
        .filter((uid) => Boolean(uid));

      const profiles = await Promise.all(uniqueUids.map((uid) => getUserProfile(uid)));
      setActorNames(
        Object.fromEntries(
          profiles
            .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
            .map((profile) => [profile.uid, `@${profile.address}`])
        )
      );
    })();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const timeframeConfig = TIMEFRAME_FILTERS.find((item) => item.value === timeframe) ?? TIMEFRAME_FILTERS[1];
    const cutoff =
      timeframeConfig.hours === null ? null : Date.now() - timeframeConfig.hours * 60 * 60 * 1000;

    return reports.filter((report) => {
      if (reasonFilter !== "all" && report.reason !== reasonFilter) {
        return false;
      }

      if (cutoff !== null && report.createdAt.toDate().getTime() < cutoff) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        report.targetId,
        report.targetOwnerUid,
        report.reporterUid,
        report.reason,
        report.details,
        actorNames[report.targetOwnerUid] ?? "",
        actorNames[report.reporterUid] ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [actorNames, reasonFilter, reports, search, timeframe]);

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <section className="rounded-postcard border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-postcard">
        You do not have permission to view moderation reports.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Moderation reports</h1>
        <p className="text-sm text-stamp-ink/75">Safety inbox with escalation-aware triage.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            className="rounded border border-stamp-muted px-2 py-1 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by uid/handle/target/reason"
            value={search}
          />
          <select
            className="rounded border border-stamp-muted px-2 py-1 text-sm"
            onChange={(event) => setReasonFilter(event.target.value as (typeof REASON_FILTERS)[number]["value"])}
            value={reasonFilter}
          >
            {REASON_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-stamp-muted px-2 py-1 text-sm"
            onChange={(event) => setTimeframe(event.target.value as (typeof TIMEFRAME_FILTERS)[number]["value"])}
            value={timeframe}
          >
            {TIMEFRAME_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading reports...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && filteredReports.length === 0 ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <p className="text-sm text-stamp-ink/70">No matching unresolved reports.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {filteredReports.map((report) => (
          <article className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard" key={report.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {report.targetType} · {report.reason}
                {report.status === "escalated" ? (
                  <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Escalated</span>
                ) : null}
              </p>
              <p className="text-xs text-stamp-ink/60">{formatTimestamp(report.createdAt)}</p>
            </div>

            <p className="mt-2 text-sm text-stamp-ink/80">
              Reporter: {actorNames[report.reporterUid] ?? report.reporterUid} · Target owner: {actorNames[report.targetOwnerUid] ?? report.targetOwnerUid}
            </p>
            <p className="mt-1 text-xs text-stamp-ink/70">Target ID: {report.targetId}</p>
            <p className="mt-1 text-xs text-stamp-ink/70">Escalation count: {report.escalationCount ?? 1}</p>
            {report.details ? <p className="mt-2 text-sm">{report.details}</p> : null}

            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-stamp-ink/80" htmlFor={`notes-${report.id}`}>
                Moderator notes
              </label>
              <textarea
                className="h-20 w-full resize-none rounded border border-stamp-muted px-2 py-1 text-sm"
                id={`notes-${report.id}`}
                maxLength={500}
                onChange={(event) => {
                  const value = event.target.value;
                  setReviewNotesById((previous) => ({
                    ...previous,
                    [report.id]: value
                  }));
                }}
                placeholder="Optional notes for audit trail"
                value={reviewNotesById[report.id] ?? ""}
              />

              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                <input
                  className="rounded border border-stamp-muted px-2 py-1 text-sm"
                  onChange={(event) => {
                    const value = event.target.value;
                    setMuteMinutesById((previous) => ({
                      ...previous,
                      [report.id]: value
                    }));
                  }}
                  placeholder={`Mute minutes (default ${SAFETY_MUTE_DEFAULT_MINUTES})`}
                  type="number"
                  value={muteMinutesById[report.id] ?? ""}
                />
                <button
                  className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => {
                    void (async () => {
                      try {
                        const rawMinutes = Number.parseInt(muteMinutesById[report.id] ?? "", 10);
                        await muteUser({
                          uid: report.targetOwnerUid,
                          moderatorUid: user.uid,
                          reason: reviewNotesById[report.id] ?? "Muted during moderation",
                          minutes: Number.isNaN(rawMinutes) ? undefined : rawMinutes
                        });
                        setError("User muted successfully.");
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Could not mute user.");
                      }
                    })();
                  }}
                  type="button"
                >
                  Mute user
                </button>
                <button
                  className="rounded border border-green-300 px-3 py-1 text-xs text-green-800 hover:bg-green-50"
                  onClick={() => {
                    void (async () => {
                      try {
                        await updateReportStatus({
                          reportId: report.id,
                          reviewerUid: user.uid,
                          status: "resolved",
                          reviewNotes: reviewNotesById[report.id] ?? "Resolved by moderator"
                        });
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Could not resolve report.");
                      }
                    })();
                  }}
                  type="button"
                >
                  Resolve
                </button>
                <button
                  className="rounded border border-stamp-muted px-3 py-1 text-xs hover:bg-stamp-muted"
                  onClick={() => {
                    void (async () => {
                      try {
                        await updateReportStatus({
                          reportId: report.id,
                          reviewerUid: user.uid,
                          status: "dismissed",
                          reviewNotes: reviewNotesById[report.id] ?? "Dismissed by moderator"
                        });
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Could not dismiss report.");
                      }
                    })();
                  }}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
