import "server-only";
import { z } from "zod";
import { challengeContentSchema, playerChallengeStateSchema, type ChallengeContent, type PlayerChallengeState } from "./catalog-schemas";
import { requestBackendJson } from "./transport";

const path = (slug: string) => `/v1/challenges/${encodeURIComponent(slug)}`;
const slugSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);
const positionSchema = z.string().regex(/^[1-9][0-9]?$/).transform(Number);

export const readGuidanceSlug = (value: string): string | null => slugSchema.safeParse(value).data ?? null;
export const readHintPosition = (value: string): number | null => positionSchema.safeParse(value).data ?? null;

export function getBackendChallengeContent(slug: string): Promise<ChallengeContent> {
  return requestBackendJson(`${path(slug)}/content`, challengeContentSchema);
}

export function getBackendPlayerState(serviceToken: string, slug: string): Promise<PlayerChallengeState> {
  return requestBackendJson(`${path(slug)}/state`, playerChallengeStateSchema, 200, { authorization: serviceToken });
}

export function unlockBackendHint(serviceToken: string, slug: string, position: number): Promise<PlayerChallengeState> {
  return requestBackendJson(`${path(slug)}/hints/${position}/unlock`, playerChallengeStateSchema, 200, { method: "POST", authorization: serviceToken });
}

export function unlockBackendWalkthrough(serviceToken: string, slug: string): Promise<PlayerChallengeState> {
  return requestBackendJson(`${path(slug)}/walkthrough/unlock`, playerChallengeStateSchema, 200, { method: "POST", authorization: serviceToken });
}
