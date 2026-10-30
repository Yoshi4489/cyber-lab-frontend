import { z } from "zod";
import type { operations } from "./generated/openapi";
export type Challenge = operations["getChallenge"]["responses"][200]["content"]["application/json"];
export const challengeSchema: z.ZodType<Challenge> = z.object({
  id: z.uuid(), slug: z.string(), title: z.string(), summary: z.string(), category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]), points: z.number().int().nonnegative(),
  kind: z.enum(["web", "shell", "artifact"]), tags: z.array(z.string()),
}).strict();
export const categoriesSchema = z.object({ categories: z.array(z.string()) }).strict();
export const challengesSchema = z.object({ challenges: z.array(challengeSchema), source: z.literal("database") }).strict();
export const catalogSchema = challengesSchema.extend({ categories: z.array(z.string()) }).strict();
export type ChallengeContent = operations["getChallengeContent"]["responses"][200]["content"]["application/json"];
export type PlayerChallengeState = operations["getPlayerChallengeState"]["responses"][200]["content"]["application/json"];
export const challengeContentSchema: z.ZodType<ChallengeContent> = z.object({
  briefingMd: z.string(), objectives: z.array(z.string()), learningOutcomes: z.array(z.string()),
  references: z.array(z.object({ label: z.string(), url: z.string().optional() }).strict()),
  hints: z.array(z.object({ position: z.number().int().positive(), cost: z.number().int().nonnegative() }).strict()),
  hasWalkthrough: z.boolean(),
  artifacts: z.array(z.object({ filename: z.string(), sizeBytes: z.number().int().nonnegative(), sha256: z.string() }).strict()),
}).strict();
export const playerChallengeStateSchema: z.ZodType<PlayerChallengeState> = z.object({
  solved: z.boolean(), pointsAwarded: z.number().int().nonnegative().nullable(),
  costApplied: z.number().int().nonnegative(), forfeited: z.boolean(),
  unlockedHints: z.array(z.object({ position: z.number().int().positive(), bodyMd: z.string(), costApplied: z.number().int().nonnegative() }).strict()),
  walkthroughMd: z.string().nullable(),
}).strict();
