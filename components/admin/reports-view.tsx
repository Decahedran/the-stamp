"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { getUserProfile } from "@/lib/services/profile-service";
import { subscribeToOpenReports, updateReportStatus } from "@/lib/services/safety-service";
import type { SafetyReportRecord } from "@/lib/types/db";
import { ADMIN_UIDS } from "@/lib/utils/constants";
import { formatTimestamp } from "@/lib/utils/dates";

export function ReportsView() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReportRecord[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = useMemo(() => Boolean(user && ADMIN_UIDS.includes(user.uid)), [user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    return subscribeToOpenReports((items) => {
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
      const uniqueUids = [...new Set(reports.flatMap((report) => [report.reporterUid, report.targetOwnerUid]))];
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
        <p className="text-sm text-stamp-ink/75">Open reports from users. Resolve or dismiss after review.</p>
      </header>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading reports...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && reports.length === 0 ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <p className="text-sm text-stamp-ink/70">No open reports. Good puppies.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {reports.map((report) => (
          <article className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard" key={report.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{report.targetType} · {report.reason}</p>
              <p className="text-xs text-stamp-ink/60">{formatTimestamp(report.createdAt)}</p>
            </div>
            <p className="mt-2 text-sm text-stamp-ink/80">
              Reporter: {actorNames[report.reporterUid] ?? report.reporterUid} · Target owner: {actorNames[report.targetOwnerUid] ?? report.targetOwnerUid}
            </p>
            <p className="mt-1 text-xs text-stamp-ink/70">Target ID: {report.targetId}</p>
            {report.details ? <p className="mt-2 text-sm">{report.details}</p> : null}

            <div className="mt-3 flex gap-2">
              <button
                className="rounded border border-green-300 px-3 py-1 text-xs text-green-800 hover:bg-green-50"
                onClick={() => {
                  void (async () => {
                    try {
                      await updateReportStatus({
                        reportId: report.id,
                        reviewerUid: user.uid,
                        status: "resolved",
                        reviewNotes: "Resolved by moderator"
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
                        reviewNotes: "Dismissed by moderator"
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
          </article>
        ))}
      </div>
    </section>
  );
}
