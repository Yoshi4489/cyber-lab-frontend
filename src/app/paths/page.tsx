import type { Metadata } from "next";
import { ComingSoon } from "@/features/preview/coming-soon";
import { getFrontendMode } from "@/features/backend/frontend-mode";
export const metadata: Metadata = { title: "Learning paths · Preview" };
export default function PathsPage() {
  return <ComingSoon kind="paths" preview={getFrontendMode() === "preview"} />;
}
