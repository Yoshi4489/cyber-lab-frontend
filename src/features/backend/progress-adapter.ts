import "server-only";
import { z } from "zod";
import { BackendAdapterError, requestBackendJson } from "./transport";
import type { operations } from "./generated/openapi";

export type BackendProfile =
  operations["getCurrentPlayerProfile"]["responses"][200]["content"]["application/json"];

const serviceTokenSchema = z
  .string()
  .max(8192)
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
export const profileSchema: z.ZodType<BackendProfile> = z
  .object({
    userId: z.uuid(),
    displayName: z.string(),
    bio: z.string().nullable(),
    totalPoints: z.number().int().nonnegative(),
    solvedCount: z.number().int().nonnegative(),
    availableChallenges: z.number().int().nonnegative(),
    solves: z.array(
      z
        .object({
          challengeId: z.uuid(),
          slug: z.string(),
          title: z.string(),
          points: z.number().int().positive(),
          solvedAt: z.iso.datetime(),
        })
        .strict(),
    ),
  })
  .strict();

/** The backend derives the profile owner from the scoped token subject only. */
export async function getBackendProfile(serviceToken: string): Promise<BackendProfile> {
  const parsed = serviceTokenSchema.safeParse(serviceToken);
  if (!parsed.success) throw new BackendAdapterError("Backend profile input is invalid.");
  return requestBackendJson("/v1/profile", profileSchema, 200, { authorization: parsed.data });
}
