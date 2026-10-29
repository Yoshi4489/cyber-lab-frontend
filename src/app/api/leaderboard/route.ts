import { previewApiResponse } from "@/features/backend/frontend-mode";
import { backendBffError, bffJson } from "@/features/backend/bff-response";
import { getBackendLeaderboard } from "@/features/backend/adapter";

// Public rankings: no session, cookie or service token is read or forwarded.
export async function GET(): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    return bffJson(await getBackendLeaderboard());
  } catch (error) {
    return backendBffError(error);
  }
}
