import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/dashboard";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { LiveHome } from "@/features/landing/live-home";
export const metadata: Metadata = { title: "Your learning space" };
export default function DashboardPage() {
  return getFrontendMode() === "preview" ? <Dashboard /> : <LiveHome />;
}
