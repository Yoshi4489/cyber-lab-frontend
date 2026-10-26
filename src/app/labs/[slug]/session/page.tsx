import { notFound, redirect } from "next/navigation";
import { BackendHttpError } from "@/features/backend/adapter";
import { ReadError } from "@/features/backend/read-error";
import { readChallenge } from "@/features/catalog/server";
import { isWelcome, toLiveLab } from "@/features/catalog/live";
import { SessionPanel } from "@/features/session/session-panel";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { getPreviewLab } from "@/features/catalog/preview";
import { PreviewSession } from "@/features/session/preview-session";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (getFrontendMode() === "preview") {
    const lab = getPreviewLab(slug);
    if (!lab) notFound();
    return <PreviewSession lab={lab} />;
  }
  let challenge;
  try { challenge = await readChallenge(slug); }
  catch (error) {
    if (error instanceof BackendHttpError && error.code === "NOT_FOUND") notFound();
    return <ReadError error={{ ok: false, code: error instanceof BackendHttpError ? error.code ?? "INTERNAL_ERROR" : "UNREACHABLE",
      ...(error instanceof BackendHttpError && error.correlationId ? { correlationId: error.correlationId } : {}) }} />;
  }
  if (challenge.slug !== slug) notFound();
  if (isWelcome(challenge)) redirect("/labs/welcome");
  return <SessionPanel lab={toLiveLab(challenge)} />;
}
