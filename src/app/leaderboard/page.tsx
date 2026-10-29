import type { Metadata } from "next";
import { Leaderboard } from "@/features/leaderboard/leaderboard";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { LiveLeaderboard } from "@/features/progress/live-progress";
export const metadata: Metadata = { title: "Leaderboard" };
export default function LeaderboardPage() {
  return getFrontendMode() === "preview" ? <Leaderboard /> : <LiveLeaderboard />;
}
