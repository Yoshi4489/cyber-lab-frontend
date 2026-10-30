import { previewApiResponse } from "@/features/backend/frontend-mode";
import { authorizedReadBffError, issueBffServiceToken } from "@/features/backend/bff-authorization";
import { bffError, bffJson } from "@/features/backend/bff-response";
import { getBackendPlayerState, readGuidanceSlug } from "@/features/backend/guidance-adapter";

export async function GET(_request: Request, context: RouteContext<"/api/challenges/[slug]/state">): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    const slug = readGuidanceSlug((await context.params).slug);
    if (!slug) return bffError(400, "INVALID_REQUEST");
    return bffJson(await getBackendPlayerState(await issueBffServiceToken("profile:read"), slug));
  } catch (error) {
    return authorizedReadBffError(error);
  }
}
