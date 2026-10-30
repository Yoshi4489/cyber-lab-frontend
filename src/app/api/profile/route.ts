import { previewApiResponse } from "@/features/backend/frontend-mode";
import { authorizedReadBffError, issueBffServiceToken } from "@/features/backend/bff-authorization";
import { bffJson } from "@/features/backend/bff-response";
import { getBackendProfile } from "@/features/backend/progress-adapter";

export async function GET(): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    const serviceToken = await issueBffServiceToken("profile:read");
    return bffJson(await getBackendProfile(serviceToken));
  } catch (error) {
    return authorizedReadBffError(error);
  }
}
