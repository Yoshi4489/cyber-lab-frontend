import "server-only";
import { z } from "zod";
import { requestBackendJson } from "./transport";
export { BackendAdapterError, BackendHttpError, BackendResponseError, BackendUnavailableError, getBackendBaseUrl } from "./transport";
export type { BackendErrorCode } from "./transport";
import type { operations } from "./generated/openapi";

export type BackendLiveness =
  operations["getLiveness"]["responses"][200]["content"]["application/json"];
export type BackendCategories =
  operations["listCategories"]["responses"][200]["content"]["application/json"];
export type BackendChallenge =
  operations["listChallenges"]["responses"][200]["content"]["application/json"]["challenges"][number];
export type BackendChallenges =
  operations["listChallenges"]["responses"][200]["content"]["application/json"];
export type BackendLeaderboard =
  operations["getLeaderboard"]["responses"][200]["content"]["application/json"];
const healthSchema: z.ZodType<BackendLiveness> = z
  .object({ status: z.literal("ok") })
  .strict();
const categoriesSchema: z.ZodType<BackendCategories> = z
  .object({ categories: z.array(z.string()) })
  .strict();
const challengeSchema: z.ZodType<BackendChallenge> = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    category: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    points: z.number().int().nonnegative(),
    kind: z.enum(["web", "shell"]),
    tags: z.array(z.string()),
  })
  .strict();
const challengesSchema: z.ZodType<BackendChallenges> = z
  .object({
    challenges: z.array(challengeSchema),
    source: z.literal("database"),
  })
  .strict();
const leaderboardSchema: z.ZodType<BackendLeaderboard> = z
  .object({
    entries: z.array(
      z
        .object({
          rank: z.number().int().positive(),
          displayName: z.string(),
          totalPoints: z.number().int().nonnegative(),
          solvedCount: z.number().int().nonnegative(),
          lastSolvedAt: z.iso.datetime().nullable(),
        })
        .strict(),
    ),
    source: z.literal("database"),
  })
  .strict();
export type BackendStatus = "not-configured" | "reachable" | "unavailable";

// Fixed path and deployment-owned origin: no user-controlled proxy destination.
export async function getBackendStatus(): Promise<BackendStatus> {
  if (!process.env.BACKEND_URL) return "not-configured";
  try {
    await getBackendLiveness();
    return "reachable";
  } catch {
    return "unavailable";
  }
}

export function getBackendLiveness(): Promise<BackendLiveness> {
  return requestBackendJson("/healthz", healthSchema);
}

export function listBackendCategories(): Promise<BackendCategories> {
  return requestBackendJson("/v1/categories", categoriesSchema);
}

export function listBackendChallenges(): Promise<BackendChallenges> {
  return requestBackendJson("/v1/challenges", challengesSchema);
}

export function getBackendChallenge(slug: string): Promise<BackendChallenge> {
  return requestBackendJson(`/v1/challenges/${encodeURIComponent(slug)}`, challengeSchema);
}

export function getBackendLeaderboard(): Promise<BackendLeaderboard> {
  return requestBackendJson("/v1/leaderboard", leaderboardSchema);
}
