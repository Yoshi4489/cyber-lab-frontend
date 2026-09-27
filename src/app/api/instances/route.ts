import { issueBffServiceToken } from "../../../features/backend/bff-authorization";
import { bffError, bffJson } from "../../../features/backend/bff-response";
import { assertSameOriginMutation } from "../../../features/backend/csrf";
import {
  instanceBffError,
  readCreateInstanceInput,
  readIdempotencyKey,
} from "../../../features/backend/instance-bff";
import { createBackendInstance } from "../../../features/backend/instance-adapter";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const input = await readCreateInstanceInput(request);
    const idempotencyKey = readIdempotencyKey(request);
    if (!input || !idempotencyKey) return bffError(400, "INVALID_REQUEST");

    const serviceToken = await issueBffServiceToken("instances:write");
    return bffJson(
      await createBackendInstance({ ...input, serviceToken, idempotencyKey }),
      202,
    );
  } catch (error) {
    return instanceBffError(error);
  }
}
