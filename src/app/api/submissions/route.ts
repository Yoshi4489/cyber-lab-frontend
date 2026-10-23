import { previewApiResponse } from "@/features/backend/frontend-mode";
import { issueBffServiceToken } from "../../../features/backend/bff-authorization";
import { bffError, bffJson } from "../../../features/backend/bff-response";
import { assertSameOriginMutation } from "../../../features/backend/csrf";
import {
  readSubmissionInput,
  submissionBffError,
} from "../../../features/backend/submission-bff";
import { submitBackendFlag } from "../../../features/backend/submission-adapter";

export async function POST(request: Request): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    assertSameOriginMutation(request);
    const input = await readSubmissionInput(request);
    if (!input) return bffError(400, "INVALID_REQUEST");

    const serviceToken = await issueBffServiceToken("submissions:write");
    return bffJson(await submitBackendFlag({ ...input, serviceToken }));
  } catch (error) {
    return submissionBffError(error);
  }
}
