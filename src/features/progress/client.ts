"use client";
import { z } from "zod";
import { requestBff, type ApiResult } from "../backend/client";
import type { operations } from "../backend/generated/openapi";

/**
 * Browser client for persisted progress. Requests never name an account: the
 * BFF resolves the sealed session server-side. Responses are parsed strictly
 * so missing fields fail closed instead of being filled with demo values.
 */

export type LiveProfile =
  operations["getCurrentPlayerProfile"]["responses"][200]["content"]["application/json"];
export type LiveLeaderboard =
  operations["getLeaderboard"]["responses"][200]["content"]["application/json"];
export type FlagSubmission =
  operations["submitFlag"]["responses"][200]["content"]["application/json"];

const profileSchema: z.ZodType<LiveProfile> = z.object({
  userId: z.uuid(),
  displayName: z.string(),
  bio: z.string().nullable(),
  totalPoints: z.number().int().nonnegative(),
  solvedCount: z.number().int().nonnegative(),
  availableChallenges: z.number().int().nonnegative(),
  solves: z.array(z.object({
    challengeId: z.uuid(),
    slug: z.string(),
    title: z.string(),
    points: z.number().int().nonnegative(),
    solvedAt: z.iso.datetime(),
  }).strict()),
}).strict();
const leaderboardSchema: z.ZodType<LiveLeaderboard> = z.object({
  entries: z.array(z.object({
    rank: z.number().int().positive(),
    displayName: z.string(),
    totalPoints: z.number().int().nonnegative(),
    solvedCount: z.number().int().nonnegative(),
    lastSolvedAt: z.iso.datetime().nullable(),
  }).strict()),
  source: z.literal("database"),
}).strict();
const submissionSchema: z.ZodType<FlagSubmission> = z.object({
  correct: z.boolean(),
  points: z.number().int().nonnegative(),
  recorded: z.literal(true),
  source: z.literal("database"),
}).strict();

export const maxFlagLength = 256;

export function readProfile(signal?: AbortSignal): Promise<ApiResult<LiveProfile>> {
  return requestBff("/api/profile", profileSchema, 200, { method: "GET", signal });
}

export function readLeaderboard(signal?: AbortSignal): Promise<ApiResult<LiveLeaderboard>> {
  return requestBff("/api/leaderboard", leaderboardSchema, 200, { method: "GET", signal });
}

/**
 * Sends one deliberate attempt. Callers must not retry automatically: an
 * unknown outcome may already be recorded, so they refresh persisted progress.
 */
export function submitFlag(
  input: { challengeId: string; instanceId?: string; flag: string },
  signal?: AbortSignal,
): Promise<ApiResult<FlagSubmission>> {
  return requestBff("/api/submissions", submissionSchema, 200, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}

/** Outcomes where the attempt may have reached the backend before failing. */
export function isUnknownSubmissionOutcome(code: string): boolean {
  return code === "UNREACHABLE" || code === "MALFORMED" || code === "INTERNAL_ERROR";
}
