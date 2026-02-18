import { z } from "zod";
import { ADDRESS_MAX_LENGTH, ADDRESS_MIN_LENGTH, POST_MAX_LENGTH } from "@/lib/utils/constants";

export const addressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(ADDRESS_MIN_LENGTH)
  .max(ADDRESS_MAX_LENGTH)
  .regex(/^[a-z0-9_]+$/, "Address can only contain lowercase letters, numbers, and underscore");

export const emailSchema = z.string().trim().email("Please enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "Post cannot be empty")
  .max(POST_MAX_LENGTH, `Post must be ${POST_MAX_LENGTH} characters or less`);

export const displayNameSchema = z.string().trim().min(1, "Display name is required").max(50);
export const bioSchema = z.string().trim().max(160);
