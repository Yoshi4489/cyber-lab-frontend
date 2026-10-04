import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstancePanel } from "@/features/instances/panel";

/**
 * Gated by a server-only flag so the surface cannot be enabled from the
 * browser and stays absent from deployments that have no backend configured.
 * It is deliberately unlinked from the demo navigation.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Instance control" };

export default function InstancesPage() {
  if (process.env.LIVE_INSTANCE_UI !== "true") notFound();
  return <InstancePanel />;
}
