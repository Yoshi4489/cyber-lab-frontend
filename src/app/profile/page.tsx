import type { Metadata } from "next";
import { LiveProgressPending } from "@/features/landing/live-home";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { Profile } from "@/features/profile/profile";
export const metadata: Metadata = { title: "Profile" };
export default function ProfilePage() {
  return getFrontendMode() === "preview" ? <Profile /> : <LiveProgressPending kind="profile" />;
}
