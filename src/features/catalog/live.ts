import type { Challenge } from "@/features/backend/catalog-schemas";
import type { Lab } from "./data";
export type LiveLab = Omit<Challenge, "difficulty"> & {
  difficulty: Lab["difficulty"]; description: string; artwork: Lab["artwork"]; accent: Lab["accent"];
};
const categories: Record<string, string> = { web: "Web security", linux: "Linux", network: "Networking", crypto: "Cryptography", forensics: "Forensics" };
export function categoryLabel(category: string): string { return categories[category] ?? category; }
export function toLiveLab(challenge: Challenge): LiveLab {
  const artwork: Record<string, Lab["artwork"]> = { web: "cookie", linux: "terminal", network: "network", crypto: "cipher", forensics: "fingerprint" };
  return { ...challenge, category: categoryLabel(challenge.category), description: challenge.summary,
    difficulty: challenge.difficulty === "easy" ? "Easy" : challenge.difficulty === "medium" ? "Medium" : "Hard",
    artwork: artwork[challenge.category] ?? "lock", accent: "mint" };
}
