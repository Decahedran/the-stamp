"use client";

import { useState } from "react";
import { z } from "zod";
import { createPost } from "@/lib/services/post-service";
import { POST_MAX_LENGTH } from "@/lib/utils/constants";
import { postContentSchema } from "@/lib/utils/validation";

type PostComposerProps = {
  authorUid: string;
  authorAddress: string;
  onPosted: () => Promise<void>;
};

export function PostComposer({ authorUid, authorAddress, onPosted }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = POST_MAX_LENGTH - content.length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const parsed = postContentSchema.parse(content);
      await createPost(authorUid, authorAddress, parsed);
      setContent("");
      await onPosted();
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Could not post postcard.");
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Could not post postcard.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-2 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium" htmlFor="post-content">
        Write a postcard
      </label>
      <textarea
        className="h-28 w-full resize-none rounded border border-stamp-muted px-3 py-2"
        id="post-content"
        maxLength={POST_MAX_LENGTH}
        onChange={(event) => setContent(event.target.value)}
        placeholder="What are you up to today?"
        value={content}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-stamp-ink/70">{remaining} characters left</p>
        <button
          className="rounded border border-stamp-muted px-3 py-1 text-sm hover:bg-stamp-muted disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Stamping..." : "Post"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
