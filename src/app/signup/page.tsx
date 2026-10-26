import type { Metadata } from "next";
import { getLab } from "@/features/catalog/data";
import { Signup } from "@/features/learner/signup";
import { AuthForm } from "@/features/auth/form";
import { getFrontendMode } from "@/features/backend/frontend-mode";

export const metadata: Metadata = { title: "Welcome" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ lab?: string; next?: string }>;
}) {
  const { lab: slug, next } = await searchParams;
  if (getFrontendMode() === "live") return <AuthForm mode="login" destination={next} />;
  const lab = typeof slug === "string" ? getLab(slug) : undefined;
  // Only catalog slugs may form return destinations; never accept arbitrary URLs.
  return <Signup destination={next ?? (lab ? `/labs/${lab.slug}` : "/dashboard")} />;
}
