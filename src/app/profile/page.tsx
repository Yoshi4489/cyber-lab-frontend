import type { Metadata } from "next";
import { ComingSoon } from "@/features/preview/coming-soon";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { Profile } from "@/features/profile/profile";
export const metadata: Metadata = { title: "Profile" };
export default function ProfilePage() {
  return getFrontendMode() === "preview" ? <Profile /> : <ComingSoon kind="profile" />;
}
