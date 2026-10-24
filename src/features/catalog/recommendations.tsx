"use client";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useResource } from "@/features/backend/use-resource";
import { readCatalog } from "./client";
import { toLiveLab } from "./live";
import { LabCard } from "./lab-card";
import { useAuth } from "@/features/auth/provider";
import { previewLabs } from "./preview";
import { useLearner } from "@/features/learner/store";

export function CatalogRecommendations() {
  const { mode } = useAuth();
  return mode === "preview"
    ? <PreviewRecommendations />
    : <LiveRecommendations />;
}
function PreviewRecommendations() {
  const { learner } = useLearner();
  const remaining = learner.signedIn ? previewLabs.filter(lab => learner.completions[lab.slug] === undefined) : previewLabs;
  return (remaining.length ? remaining : previewLabs).slice(0, 3).map(lab => <LabCard key={lab.slug} lab={lab} />);
}
function LiveRecommendations() {
  const resource = useResource(readCatalog);
  if (resource.loading) return <p role="status">Loading published labs…</p>;
  if (resource.error) return <div><ApiError error={resource.error} /><Button onClick={resource.retry}>Retry recommendations</Button></div>;
  if (!resource.value?.challenges.length) return <p>No published labs are available yet.</p>;
  return resource.value.challenges.slice(0, 3).map(challenge => <LabCard key={challenge.id} lab={toLiveLab(challenge)} />);
}
