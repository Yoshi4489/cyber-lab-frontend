import { previewApiResponse } from "@/features/backend/frontend-mode";
import { issueBffServiceToken } from "../../../../features/backend/bff-authorization";
import { bffError, bffJson } from "../../../../features/backend/bff-response";
import { assertSameOriginMutation } from "../../../../features/backend/csrf";
import {
  hasEmptyBody,
  instanceBffError,
  readIdempotencyKey,
  readInstanceId,
} from "../../../../features/backend/instance-bff";
import {
  destroyBackendInstance,
  getBackendInstance,
} from "../../../../features/backend/instance-adapter";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/instances/[id]">,
): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    const instanceId = readInstanceId((await context.params).id);
    if (!instanceId) return bffError(400, "INVALID_REQUEST");

    const serviceToken = await issueBffServiceToken("instances:read");
    return bffJson(await getBackendInstance({ serviceToken, instanceId }));
  } catch (error) {
    return instanceBffError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/instances/[id]">,
): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    assertSameOriginMutation(request);
    const instanceId = readInstanceId((await context.params).id);
    const idempotencyKey = readIdempotencyKey(request);
    if (!instanceId || !idempotencyKey || !(await hasEmptyBody(request))) {
      return bffError(400, "INVALID_REQUEST");
    }

    const serviceToken = await issueBffServiceToken("instances:write");
    return bffJson(
      await destroyBackendInstance({ serviceToken, instanceId, idempotencyKey }),
      202,
    );
  } catch (error) {
    return instanceBffError(error);
  }
}
