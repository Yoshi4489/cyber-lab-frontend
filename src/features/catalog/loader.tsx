"use client";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useResource } from "@/features/backend/use-resource";
import { readCatalog } from "./client";
import { categoryLabel, toLiveLab } from "./live";
import { Catalog } from "./catalog";
export function CatalogLoader({ savedOnly = false }: { savedOnly?: boolean }) {
  const resource = useResource(readCatalog);
  if (resource.loading) return <p role="status">Loading labs…</p>;
  if (resource.error) return <section><ApiError error={resource.error} /><Button onClick={resource.retry}>Retry loading labs</Button></section>;
  return resource.value ? <Catalog labs={resource.value.challenges.map(toLiveLab)} categories={["All labs", ...resource.value.categories.map(categoryLabel)]} savedOnly={savedOnly} /> : null;
}
