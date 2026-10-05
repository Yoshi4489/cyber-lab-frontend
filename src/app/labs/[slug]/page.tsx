import { notFound } from "next/navigation";
import { BackendHttpError } from "@/features/backend/adapter";
import { ReadError } from "@/features/backend/read-error";
import { readChallenge } from "@/features/catalog/server";
import { toLiveLab } from "@/features/catalog/live";
import { LabBriefing } from "@/features/briefing/lab-briefing";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let challenge;
  try { challenge = await readChallenge(slug); }
  catch (error) {
    if (error instanceof BackendHttpError && error.code === "NOT_FOUND") notFound();
    return <ReadError error={{ ok: false, code: error instanceof BackendHttpError ? error.code ?? "INTERNAL_ERROR" : "UNREACHABLE",
      ...(error instanceof BackendHttpError && error.correlationId ? { correlationId: error.correlationId } : {}) }} />;
  }
  if (challenge.slug !== slug) notFound();
  return <LabBriefing lab={toLiveLab(challenge)} />;
}
