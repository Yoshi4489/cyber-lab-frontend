"use client";
import { Dashboard } from "@/features/dashboard/dashboard";
import { useLearner } from "@/features/learner/store";
import { Landing } from "./landing";
import { useAuth } from "@/features/auth/provider";
import { LiveHome } from "./live-home";

export function HomeExperience() {
  const { learner } = useLearner();
  const { mode } = useAuth();
  if (mode === "live") return <LiveHome />;
  return learner.signedIn ? <Dashboard /> : <Landing />;
}
