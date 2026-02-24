"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { reportContent } from "@/lib/services/safety-service";
import type { ReportReason, ReportTargetType } from "@/lib/types/db";
import { REPORT_DETAIL_MAX_LENGTH } from "@/lib/utils/constants";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "bullying_harassment", label: "Bullying / harassment" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence_threats", label: "Violence / threats" },
  { value: "self_harm", label: "Self-harm concerns" },
  { value: "hate_abuse", label: "Hate / abuse" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" }
];

type ReportButtonProps = {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid: string;
  className?: string;
  onReported?: (message: string) => void;
  onError?: (message: string) => void;
};

export function ReportButton({
  targetType,
  targetId,
  targetOwnerUid,
  className = "rounded border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50",
  onReported,
  onError
}: ReportButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<ReportReason>("bullying_harassment");
  const [details, setDetails] = useState("");

  const detailsRemaining = useMemo(() => REPORT_DETAIL_MAX_LENGTH - details.length, [details.length]);

  if (!user || targetOwnerUid === user.uid) {
    return null;
  }

  async function submitReport() {
    if (!user) {
      onError?.("You must be signed in to report content.");
      return;
    }

    setBusy(true);

    try {
      await reportContent({
        reporterUid: user.uid,
        targetType,
        targetId,
        targetOwnerUid,
        reason,
        details
      });

      setOpen(false);
      setReason("bullying_harassment");
      setDetails("");
      onReported?.("Thanks. Your report has been submitted.");
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : "Could not submit report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={className}
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Report
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
            <h3 className="text-sm font-semibold">Report {targetType}</h3>
            <p className="text-xs text-stamp-ink/70">Choose the reason that best matches the issue.</p>

            <label className="block text-xs font-medium text-stamp-ink/80" htmlFor="report-reason">
              Reason
            </label>
            <select
              className="w-full rounded border border-stamp-muted px-2 py-1 text-sm"
              id="report-reason"
              onChange={(event) => setReason(event.target.value as ReportReason)}
              value={reason}
            >
              {REPORT_REASONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-medium text-stamp-ink/80" htmlFor="report-details">
              Details (optional)
            </label>
            <textarea
              className="h-24 w-full resize-none rounded border border-stamp-muted px-2 py-1 text-sm"
              id="report-details"
              maxLength={REPORT_DETAIL_MAX_LENGTH}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Add context that helps moderators review this quickly."
              value={details}
            />
            <p className="text-xs text-stamp-ink/60">{detailsRemaining} characters left</p>

            <div className="flex justify-end gap-2">
              <button
                className="rounded border border-stamp-muted px-3 py-1 text-xs hover:bg-stamp-muted"
                disabled={busy}
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded border border-amber-300 px-3 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                disabled={busy}
                onClick={() => {
                  void submitReport();
                }}
                type="button"
              >
                {busy ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
