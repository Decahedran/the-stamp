import type { Timestamp } from "firebase/firestore";

export function formatTimestamp(value: Timestamp | null | undefined): string {
  if (!value) {
    return "just now";
  }

  const date = value.toDate();
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
