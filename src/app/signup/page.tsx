import type { Metadata } from "next";
import { getLab } from "@/features/catalog/data";
import { Signup } from "@/features/learner/signup";

export const metadata: Metadata = { title: "Join the demo" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ lab?: string; next?: string }>;
}) {
  const { lab: slug, next } = await searchParams;
  const lab = typeof slug === "string" ? getLab(slug) : undefined;
  // Only catalog slugs may form return destinations; never accept arbitrary URLs.
  return <Signup destination={next ?? (lab ? `/labs/${lab.slug}` : "/dashboard")} />;
}
