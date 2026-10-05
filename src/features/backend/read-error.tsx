"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "./api-error";
import type { ApiFailure } from "./client";
export function ReadError({ error }: { error: ApiFailure }) {
  const router = useRouter();
  return <section><ApiError error={error} /><Button onClick={() => router.refresh()}>Retry</Button></section>;
}
