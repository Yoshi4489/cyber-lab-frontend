"use client";
import { readLocalLearner, transactLearner } from "@/features/learner/store";
import { advancePreview, applyPreviewCommand, type PreviewCommand, type PreviewCommandResult } from "./preview-model";

// Web Locks serialize the read/update/write across same-origin browser tabs.
// A synchronous transaction also keeps the current tab usable without storage
// or Web Locks; this local demo never confers server authorization.
async function locked<T>(action: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request("ciscoku:preview-session", action) : action();
}
export function runPreviewCommand(command: PreviewCommand): Promise<PreviewCommandResult> {
  const { username, signedIn, identityEpoch } = readLocalLearner();
  // Bind queued work to the local sign-in that initiated it. A new nonce also
  // cancels stale work after signing out and back in with the same username.
  const actor = { username, signedIn, identityEpoch };
  return locked(() => transactLearner(current => {
    const { learner, result } = applyPreviewCommand(current, command, Date.now(), undefined, actor);
    return { learner, value: result };
  }));
}
export function advancePreviewSessions(now: number) {
  return locked(() => transactLearner(current => ({ learner: advancePreview(current, now), value: undefined })));
}
