import type { operations } from "@/features/backend/generated/openapi";
import { catalogSchema, type Challenge } from "@/features/backend/catalog-schemas";
import { labs, type Lab } from "./data";

const categoryIds: Record<Lab["category"], string> = {
  "Web security": "web", Linux: "linux", Networking: "network",
  Cryptography: "crypto", Forensics: "forensics",
};
type CatalogResponse = operations["listChallenges"]["responses"][200]["content"]["application/json"];
const response: CatalogResponse & { categories: string[] } = {
  source: "database",
  categories: Object.values(categoryIds),
  challenges: labs.map((lab, index): Challenge => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: lab.slug, title: lab.title, summary: lab.description,
    category: categoryIds[lab.category],
    difficulty: lab.difficulty === "Easy" ? "easy" : lab.difficulty === "Medium" ? "medium" : "hard",
    points: lab.points, kind: lab.category === "Linux" ? "shell" : "web", tags: lab.tags,
  })),
};

// The DTO follows the committed API. Its origin and editorial presentation
// stay outside that DTO; source="database" never makes this actual activity.
export const previewCatalog = { origin: "preview" as const, response: catalogSchema.parse(response) };
export const previewLabs: Lab[] = previewCatalog.response.challenges.map(challenge => ({
  ...labs.find(lab => lab.slug === challenge.slug)!,
  title: challenge.title, description: challenge.summary, points: challenge.points, tags: challenge.tags,
}));
export function getPreviewLab(slug: string) {
  return previewLabs.find(lab => lab.slug === slug);
}
