"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useAuth } from "@/features/auth/provider";
import { useLearner } from "@/features/learner/store";
export function StartLab({ slug, label = "Start Lab" }: { slug: string; label?: string }) {
  const { session, loading, error, refresh, mode } = useAuth();
  const { learner, ready } = useLearner();
  if (mode === "preview" && !ready) return <Button disabled className="full-width">Getting your demo ready…</Button>;
  if (mode === "preview") return <Button asChild className="full-width">
    <Link href={learner.signedIn ? `/labs/${slug}/session` : `/login?next=${encodeURIComponent(`/labs/${slug}/session`)}`}>Preview session</Link>
  </Button>;
  if (loading) return <Button disabled className="full-width">Checking session…</Button>;
  if (error) return <><ApiError error={error} /><Button onClick={() => void refresh()}>Retry session</Button></>;
  if (!session?.authenticated) return <Button asChild className="full-width"><Link href={`/login?next=${encodeURIComponent(`/labs/${slug}/session`)}`}>{label}</Link></Button>;
  if (!session.user.emailVerified) return <Button asChild className="full-width"><Link href="/verify-email">Verify email to start</Link></Button>;
  return <Button asChild className="full-width"><Link href={`/labs/${slug}/session`}>{label}</Link></Button>;
}
