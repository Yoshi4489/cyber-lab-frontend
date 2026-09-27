import { issueBffServiceToken } from "../../../../../features/backend/bff-authorization";
import { bffError, bffJson } from "../../../../../features/backend/bff-response";
import { assertSameOriginMutation } from "../../../../../features/backend/csrf";
import {
  hasEmptyBody,
  instanceBffError,
  readIdempotencyKey,
  readInstanceId,
} from "../../../../../features/backend/instance-bff";
import { extendBackendInstance } from "../../../../../features/backend/instance-adapter";

export async function POST(
  request: Request,
  context: RouteContext<"/api/instances/[id]/extend">,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const instanceId = readInstanceId((await context.params).id);
    const idempotencyKey = readIdempotencyKey(request);
    if (!instanceId || !idempotencyKey || !(await hasEmptyBody(request))) {
      return bffError(400, "INVALID_REQUEST");
    }

    const serviceToken = await issueBffServiceToken("instances:write");
    return bffJson(
      await extendBackendInstance({ serviceToken, instanceId, idempotencyKey }),
      202,
    );
  } catch (error) {
    return instanceBffError(error);
  }
}
