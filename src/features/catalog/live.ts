import type { Challenge } from "@/features/backend/catalog-schemas";
import type { Lab } from "./data";
export type LiveLab = Omit<Challenge, "difficulty"> & {
  difficulty: Lab["difficulty"]; description: string; artwork: Lab["artwork"]; accent: Lab["accent"];
};
const categories: Record<string, string> = { web: "Web security", linux: "Linux", network: "Networking", crypto: "Cryptography", forensics: "Forensics", reversing: "Reverse engineering" };
export function categoryLabel(category: string): string { return categories[category] ?? category; }
export function isWelcome(challenge: Pick<Challenge, "id" | "slug">): boolean {
  return challenge.id === "88888888-8888-4888-8888-888888888888" && challenge.slug === "welcome";
}
export function toLiveLab(challenge: Challenge): LiveLab {
  const artwork: Record<string, Lab["artwork"]> = { web: "cookie", linux: "terminal", network: "network", crypto: "cipher", forensics: "fingerprint", reversing: "terminal" };
  return { ...challenge, category: categoryLabel(challenge.category), description: challenge.summary,
    difficulty: challenge.difficulty === "easy" ? "Easy" : challenge.difficulty === "medium" ? "Medium" : "Hard",
    artwork: isWelcome(challenge) ? "lock" : artwork[challenge.category] ?? "lock", accent: "mint" };
}
