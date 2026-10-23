"use client";
import { useEffect, useRef, useState } from "react";
import { useLearner } from "@/features/learner/store";
import { useClock } from "@/hooks/use-clock";
import type { ApiFailure } from "@/features/backend/client";
import { advancePreview, type PreviewCommand } from "./preview-model";
import { advancePreviewSessions, runPreviewCommand } from "./actions";

export function usePreviewSession(challengeId: string) {
  const { learner, ready, temporary } = useLearner();
  const now = useClock();
  const state = ready && now ? advancePreview(learner, now) : learner;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiFailure | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    if (ready && now) void advancePreviewSessions(now);
  }, [ready, now]);
  async function mutate(operation: PreviewCommand["operation"]) {
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setBusy(true); setError(null);
    try {
      const key = `${operation}:${crypto.randomUUID()}`;
      const command: PreviewCommand = operation === "create" ? { operation, challengeId, key }
        : { operation, instanceId: state.activeSession?.instance.id ?? "", key };
      const result = await runPreviewCommand(command);
      if (!result.ok) setError(result);
    } catch {
      setError({ ok: false, code: "INTERNAL_ERROR" });
    } finally { inFlight.current = false; setBusy(false); }
  }
  return { learner: state, ready, temporary, now, busy, error, mutate };
}
