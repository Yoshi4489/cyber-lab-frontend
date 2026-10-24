import { levelFor, progressFor, type Learner } from "@/features/learner/model";

type Entry = {
  id: string;
  name: string;
  xp: number;
  completed: number;
  current: boolean;
};
const samples: Entry[] = [
  { id: "owl", name: "pixel_owl", xp: 1250, completed: 7, current: false },
  { id: "fern", name: "curious_fern", xp: 1000, completed: 6, current: false },
  { id: "fox", name: "packet_fox", xp: 850, completed: 5, current: false },
  { id: "moss", name: "moss_byte", xp: 700, completed: 4, current: false },
  { id: "orbit", name: "little_orbit", xp: 550, completed: 3, current: false },
  { id: "seed", name: "seedling_42", xp: 300, completed: 2, current: false },
  { id: "otter", name: "hello_otter", xp: 100, completed: 1, current: false },
];

// Fictional comparison data. Tied XP earns the same displayed rank.
export function rankings(learner: Learner) {
  const entries = [...samples];
  if (learner.signedIn && learner.username) {
    const progress = progressFor(learner, 0);
    entries.push({
      id: "current-demo",
      name: learner.username,
      xp: progress.xp,
      completed: progress.completedCount,
      current: true,
    });
  }
  return entries
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
    .map((entry) => ({
      ...entry,
      rank: 1 + entries.filter((other) => other.xp > entry.xp).length,
      level: levelFor(entry.xp),
    }));
}
