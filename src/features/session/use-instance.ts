"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/provider";
import type { ApiFailure } from "@/features/backend/client";
import { createInstance, destroyInstance, extendInstance, isActive, isTransitional, readInstance, type Instance, type InstanceOperation } from "@/features/instances/client";
import { completeMutation, forgetInstance, mutationKey, rememberedInstance, rememberInstance } from "./storage";

export function useInstance(challengeId: string) {
  const { session, refresh } = useAuth();
  const authenticated = session?.authenticated === true;
  const [instance, setInstance] = useState<Instance | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState<InstanceOperation | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [reload, setReload] = useState(0);
  const keys = useRef(new Map<string, string>());
  const operationController = useRef<AbortController | null>(null);
  const currentInstance = useRef<Instance | null>(null);
  const revision = useRef(0);

  const apply = useCallback((value: Instance) => {
    currentInstance.current = value;
    setInstance(value); setError(null);
    if (isActive(value.status) || value.status === "stopping") setStorageWarning(!rememberInstance(value.id, value.challengeId));
    else forgetInstance();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const changed = ++revision.current;
    currentInstance.current = null;
    operationController.current?.abort();
    operationController.current = null;
    keys.current.clear();
    async function restore() {
      setInstance(null); setError(null); setBusy(null); setRestoring(true);
      if (authenticated) {
        const remembered = rememberedInstance();
        if (remembered) {
          const result = await readInstance(remembered.instanceId, controller.signal);
          if (controller.signal.aborted || changed !== revision.current) return;
          if (result.ok) apply(result.value);
          else {
            setError(result);
            if (result.code === "NOT_FOUND" || result.code === "UNAUTHORIZED") forgetInstance();
          }
        }
      }
      if (!controller.signal.aborted) setRestoring(false);
    }
    void restore();
    return () => { controller.abort(); operationController.current?.abort(); };
  }, [authenticated, challengeId, apply, reload]);

  const instanceId = instance?.id;
  const status = instance?.status;
  useEffect(() => {
    if (!authenticated || !instanceId || !status || (!isActive(status) && status !== "stopping")) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const changed = revision.current;
      const result = await readInstance(instanceId!, controller.signal);
      if (controller.signal.aborted) return;
      let delay = isTransitional(status!) ? 2000 : 15000;
      if (changed !== revision.current || operationController.current) {
        timer = setTimeout(poll, delay);
        return;
      }
      if (result.ok) {
        // A poll started before a mutation must not overwrite its accepted state.
        apply(result.value);
        if (!isActive(result.value.status) && result.value.status !== "stopping") return;
      } else {
        setError(result);
        if (result.code === "UNAUTHORIZED") { forgetInstance(); void refresh(); return; }
        if (result.code === "NOT_FOUND") {
          forgetInstance(); currentInstance.current = null; setInstance(null); return;
        }
        delay = result.code === "RATE_LIMITED" ? result.retryAfterMs ?? 60000 : 15000;
      }
      timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, isTransitional(status) ? 2000 : 15000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [authenticated, instanceId, status, apply, refresh]);

  const mutate = useCallback(async (operation: InstanceOperation) => {
    if (!authenticated || operationController.current) return;
    const owned = currentInstance.current;
    if (operation !== "create" && !owned) return;
    const id = operation === "create" ? challengeId : owned!.id;
    const controller = new AbortController();
    operationController.current = controller;
    const changed = ++revision.current;
    setBusy(operation); setError(null);
    const key = mutationKey(operation, id, keys.current);
    const result = operation === "create" ? await createInstance(challengeId, key, controller.signal)
      : operation === "extend" ? await extendInstance(id, key, controller.signal) : await destroyInstance(id, key, controller.signal);
    if (controller.signal.aborted || changed !== revision.current) return;
    operationController.current = null;
    setBusy(null);
    if (result.ok) { completeMutation(operation, id, keys.current); apply(result.value.instance); }
    else {
      setError(result);
      if (result.code === "UNAUTHORIZED") void refresh();
    }
  }, [authenticated, challengeId, apply, refresh]);
  const retry = useCallback(() => setReload(value => value + 1), []);
  return { instance, error, restoring, busy, storageWarning, mutate, retry };
}
