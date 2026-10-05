"use client";
import { useCallback, useEffect, useState } from "react";
import type { ApiFailure, ApiResult } from "./client";

export function useResource<T>(load: (signal?: AbortSignal) => Promise<ApiResult<T>>, enabled = true) {
  const [state, setState] = useState<{ value: T | null; error: ApiFailure | null; loading: boolean }>({ value: null, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => { setState({ value: null, error: null, loading: true }); setRevision(value => value + 1); }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void load(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setState(result.ok ? { value: result.value, error: null, loading: false } : { value: null, error: result, loading: false });
    });
    return () => controller.abort();
  }, [load, enabled, revision]);
  return { ...state, value: enabled ? state.value : null, loading: enabled && state.loading, retry };
}
