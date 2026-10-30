import { previewApiResponse } from "@/features/backend/frontend-mode";
import { issueBffServiceToken } from "@/features/backend/bff-authorization";
import { bffError, bffJson } from "@/features/backend/bff-response";
import { assertSameOriginMutation } from "@/features/backend/csrf";
import { readGuidanceSlug, readHintPosition, unlockBackendHint } from "@/features/backend/guidance-adapter";
import { hasEmptyBody } from "@/features/backend/instance-bff";
import { submissionBffError } from "@/features/backend/submission-bff";

export async function POST(request: Request, context: RouteContext<"/api/challenges/[slug]/hints/[position]/unlock">): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    assertSameOriginMutation(request);
    const params = await context.params;
    const slug = readGuidanceSlug(params.slug);
    const position = readHintPosition(params.position);
    if (!slug || !position || !(await hasEmptyBody(request))) return bffError(400, "INVALID_REQUEST");
    return bffJson(await unlockBackendHint(await issueBffServiceToken("submissions:write"), slug, position));
  } catch (error) {
    return submissionBffError(error);
  }
}
