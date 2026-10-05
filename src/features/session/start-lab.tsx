"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useAuth } from "@/features/auth/provider";
export function StartLab({ slug }: { slug: string }) {
  const { session, loading, error, refresh } = useAuth();
  if (loading) return <Button disabled className="full-width">Checking session…</Button>;
  if (error) return <><ApiError error={error} /><Button onClick={() => void refresh()}>Retry session</Button></>;
  if (!session?.authenticated) return <Button asChild className="full-width"><Link href={`/login?next=${encodeURIComponent(`/labs/${slug}/session`)}`}>Start Lab</Link></Button>;
  if (!session.user.emailVerified) return <Button asChild className="full-width"><Link href="/verify-email">Verify email to start</Link></Button>;
  return <Button asChild className="full-width"><Link href={`/labs/${slug}/session`}>Start Lab</Link></Button>;
}
