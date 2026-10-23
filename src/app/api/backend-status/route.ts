import { previewApiResponse } from "@/features/backend/frontend-mode";
import { getBackendStatus } from "@/features/backend/adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const preview = previewApiResponse();
  if (preview) return preview;
  return Response.json(
    { status: await getBackendStatus() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
