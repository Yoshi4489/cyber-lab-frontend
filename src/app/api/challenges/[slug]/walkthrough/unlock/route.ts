import { previewApiResponse } from "@/features/backend/frontend-mode";
import { issueBffServiceToken } from "@/features/backend/bff-authorization";
import { bffError, bffJson } from "@/features/backend/bff-response";
import { assertSameOriginMutation } from "@/features/backend/csrf";
import { readGuidanceSlug, unlockBackendWalkthrough } from "@/features/backend/guidance-adapter";
import { hasEmptyBody } from "@/features/backend/instance-bff";
import { submissionBffError } from "@/features/backend/submission-bff";

export async function POST(request: Request, context: RouteContext<"/api/challenges/[slug]/walkthrough/unlock">): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    assertSameOriginMutation(request);
    const slug = readGuidanceSlug((await context.params).slug);
    if (!slug || !(await hasEmptyBody(request))) return bffError(400, "INVALID_REQUEST");
    return bffJson(await unlockBackendWalkthrough(await issueBffServiceToken("submissions:write"), slug));
  } catch (error) {
    return submissionBffError(error);
  }
}
