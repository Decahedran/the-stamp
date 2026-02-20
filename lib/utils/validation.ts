import { z } from "zod";
import { ADDRESS_MAX_LENGTH, ADDRESS_MIN_LENGTH, COMMENT_MAX_LENGTH, POST_MAX_LENGTH } from "@/lib/utils/constants";

function looksLikeStreetAddress(value: string): boolean {
  const compact = value.replace(/_/g, "");
  const hasLeadingHouseNumber = /^\d{1,6}/.test(compact);
  const hasStreetKeyword = /(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard|court|ct|way|highway|hwy|apt|suite|unit)/.test(
    compact
  );

  return hasLeadingHouseNumber && hasStreetKeyword;
}

export const addressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(ADDRESS_MIN_LENGTH)
  .max(ADDRESS_MAX_LENGTH)
  .regex(/^[a-z0-9_]+$/, "@ddress can only contain lowercase letters, numbers, and underscore")
  .refine((value) => !looksLikeStreetAddress(value), {
    message: "@ddress should be a username handle (like derek_ink), not a street address"
  });

export const emailSchema = z.string().trim().email("Please enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "Post cannot be empty")
  .max(POST_MAX_LENGTH, `Post must be ${POST_MAX_LENGTH} characters or less`);

export const commentContentSchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(COMMENT_MAX_LENGTH, `Comment must be ${COMMENT_MAX_LENGTH} characters or less`);

export const displayNameSchema = z.string().trim().min(1, "Display name is required").max(50);
export const bioSchema = z.string().trim().max(160);
