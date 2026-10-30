import { previewApiResponse } from "@/features/backend/frontend-mode";
import { authorizedReadBffError, issueBffServiceToken } from "@/features/backend/bff-authorization";
import { bffError } from "@/features/backend/bff-response";
import { downloadBackendArtifact, readArtifactFilename, readGuidanceSlug } from "@/features/backend/guidance-adapter";

export async function GET(_request: Request, context: RouteContext<"/api/challenges/[slug]/artifacts/[filename]">): Promise<Response> {
  const preview = previewApiResponse();
  if (preview) return preview;
  try {
    const params = await context.params;
    const slug = readGuidanceSlug(params.slug);
    const filename = readArtifactFilename(params.filename);
    if (!slug || !filename) return bffError(400, "INVALID_REQUEST");
    const bytes = await downloadBackendArtifact(await issueBffServiceToken("profile:read"), slug, filename);
    return new Response(bytes, { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    return authorizedReadBffError(error);
  }
}
