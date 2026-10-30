import "server-only";
import { cache } from "react";
import { getBackendChallenge } from "@/features/backend/adapter";
import { getBackendChallengeContent } from "@/features/backend/guidance-adapter";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { previewCatalog } from "./preview";
export const readChallenge = cache(async (slug: string) => {
  if (getFrontendMode() === "preview") {
    const challenge = previewCatalog.response.challenges.find(item => item.slug === slug);
    if (!challenge) throw new Error("Unknown preview lab");
    return challenge;
  }
  return getBackendChallenge(slug);
});
export const readChallengeContent = cache((slug: string) => getBackendChallengeContent(slug));
