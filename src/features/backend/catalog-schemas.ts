import { z } from "zod";
import type { operations } from "./generated/openapi";
export type Challenge = operations["getChallenge"]["responses"][200]["content"]["application/json"];
export const challengeSchema: z.ZodType<Challenge> = z.object({
  id: z.uuid(), slug: z.string(), title: z.string(), summary: z.string(), category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]), points: z.number().int().nonnegative(),
  kind: z.enum(["web", "shell"]), tags: z.array(z.string()),
}).strict();
export const categoriesSchema = z.object({ categories: z.array(z.string()) }).strict();
export const challengesSchema = z.object({ challenges: z.array(challengeSchema), source: z.literal("database") }).strict();
export const catalogSchema = challengesSchema.extend({ categories: z.array(z.string()) }).strict();
