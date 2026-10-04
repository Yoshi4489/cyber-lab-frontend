"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  ExternalLink,
  Play,
  RefreshCw,
  Server,
  Square,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClock } from "@/hooks/use-clock";
import {
  createInstance,
  destroyInstance,
  errorMessage,
  extendInstance,
  formatCountdown,
  isActive,
  isChallengeId,
  isTransitional,
  newIdempotencyKey,
  readInstance,
  remainingMs,
  targetUrlFor,
  type Instance,
  type InstanceErrorCode,
  type InstanceOperation,
} from "./client";
import styles from "./instances.module.css";

const pollIntervalMs = 2000;

/**
 * Operator-facing lifecycle surface for the instance BFF. It is reachable only
 * when the deployment enables it, is never linked from the browser-local demo,
 * and shows nothing it did not receive from the backend through the BFF.
 */
export function InstancePanel() {
  const now = useClock();
  const [challengeId, setChallengeId] = useState("");
  const [instance, setInstance] = useState<Instance | null>(null);
  const [error, setError] = useState<InstanceErrorCode | null>(null);
  const [busy, setBusy] = useState<InstanceOperation | "refresh" | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  // A logical mutation keeps one key across retries so a retried request is
  // never treated as a second spawn, extension, or destruction.
  const retainedKeys = useRef(new Map<InstanceOperation, string>());

  const keyFor = useCallback((operation: InstanceOperation) => {
    const retained = retainedKeys.current.get(operation);
    if (retained) return retained;

    const key = newIdempotencyKey(operation);
    retainedKeys.current.set(operation, key);
    return key;
  }, []);

  const instanceId = instance?.id;
  const transitional = instance ? isTransitional(instance.status) : false;

  useEffect(() => {
    if (!instanceId || !transitional) return;

    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      const result = await readInstance(instanceId, controller.signal);
      if (result.ok) {
        setInstance(result.value);
        return;
      }
      // An aborted poll reports UNREACHABLE; do not surface it on teardown.
      if (result.code !== "UNREACHABLE") setError(result.code);
    }, pollIntervalMs);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [instanceId, transitional]);

  async function spawn() {
    if (!isChallengeId(challengeId)) {
      setError("INVALID_REQUEST");
      setLastOperation(null);
      return;
    }

    setBusy("create");
    setError(null);
    const result = await createInstance(challengeId, keyFor("create"));
    setBusy(null);
    if (!result.ok) {
      setError(result.code);
      return;
    }

    retainedKeys.current.delete("create");
    setInstance(result.value.instance);
    setLastOperation(describeOperation("create", result.value.replayed));
  }

  async function mutate(operation: "extend" | "destroy") {
    if (!instanceId) return;

    setBusy(operation);
    setError(null);
    const result =
      operation === "extend"
        ? await extendInstance(instanceId, keyFor("extend"))
        : await destroyInstance(instanceId, keyFor("destroy"));
    setBusy(null);
    if (!result.ok) {
      setError(result.code);
      return;
    }

    retainedKeys.current.delete(operation);
    setInstance(result.value.instance);
    setLastOperation(describeOperation(operation, result.value.replayed));
  }

  async function refresh() {
    if (!instanceId) return;

    setBusy("refresh");
    setError(null);
    const result = await readInstance(instanceId);
    setBusy(null);
    if (result.ok) setInstance(result.value);
    else setError(result.code);
  }

  const targetUrl = instance ? targetUrlFor(instance) : null;
  return (
    <div className={styles.page}>
      <p className={styles.warning} role="note">
        <AlertTriangle size={15} />
        <span>
          Live control surface. This page drives real backend instances and is
          not part of the demo workspace; the label in the header above does not
          apply here.
        </span>
      </p>
      <header>
        <p className="eyebrow">INSTANCE LIFECYCLE</p>
        <h1>Instance control</h1>
        <p>
          Spawn, poll, extend, and destroy one instance through the same-origin
          BFF. Identity comes from the backend session cookie, never from this
          page.
        </p>
      </header>

      <section className={styles.panel} aria-label="Instance lifecycle">
        <div className={styles.top}>
          <span className={styles.icon}>
            <Server size={24} />
          </span>
          <span className={styles.status} role="status">
            {instance ? instance.status : "no instance"}
          </span>
        </div>

        {instance ? (
          <>
            <h2>Instance {instance.id.slice(0, 8)}</h2>
            {isActive(instance.status) && (
              <div className={styles.timer}>
                <Clock3 size={20} />
                <div>
                  <span>Expires in</span>
                  <strong role="timer" aria-label="Time remaining">
                    {formatCountdown(remainingMs(instance, now))}
                  </strong>
                </div>
              </div>
            )}
            <dl className={styles.details}>
              <div>
                <dt>Status</dt>
                <dd data-testid="instance-status">{instance.status}</dd>
              </div>
              <div>
                <dt>Challenge</dt>
                <dd>{instance.challengeId}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{instance.startedAt ?? "not started"}</dd>
              </div>
              <div>
                <dt>Hard expiry</dt>
                <dd>{instance.absoluteExpiresAt}</dd>
              </div>
              {instance.failureCode && (
                <div>
                  <dt>Failure</dt>
                  <dd>{instance.failureCode}</dd>
                </div>
              )}
              <div>
                <dt>Target</dt>
                <dd>
                  {targetUrl ? (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-testid="instance-target"
                    >
                      {targetUrl} <ExternalLink size={13} />
                    </a>
                  ) : (
                    "withheld until running"
                  )}
                </dd>
              </div>
            </dl>

            <div className={styles.actions}>
              <Button
                onClick={() => mutate("extend")}
                disabled={busy !== null || !isActive(instance.status)}
              >
                <TimerReset size={15} /> Extend
              </Button>
              <Button
                variant="secondary"
                onClick={refresh}
                disabled={busy !== null}
              >
                <RefreshCw size={15} /> Refresh
              </Button>
              <Button
                variant="ghost"
                onClick={() => mutate("destroy")}
                disabled={busy !== null || !isActive(instance.status)}
              >
                <Square size={13} /> Destroy
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2>Spawn an instance</h2>
            <p>
              Enter the challenge identifier to request one private target. The
              browser retains an idempotency key so a retry cannot spawn twice.
            </p>
            <label htmlFor="challenge-id">Challenge ID</label>
            <Input
              id="challenge-id"
              name="challengeId"
              value={challengeId}
              onChange={(event) => setChallengeId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="challenge-id-help"
            />
            <p id="challenge-id-help" className={styles.help}>
              A challenge UUID from the backend catalog.
            </p>
            <Button
              className="full-width"
              onClick={spawn}
              disabled={busy !== null}
            >
              <Play size={15} /> {busy === "create" ? "Spawning…" : "Spawn"}
            </Button>
          </>
        )}

        <p className={styles.operation} role="status">
          {lastOperation ??
            (transitional ? "Polling backend for state changes…" : "")}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            <AlertTriangle size={15} />
            <span>
              {errorMessage(error)} <code>{error}</code>
            </span>
          </p>
        )}
      </section>
    </div>
  );
}

function describeOperation(
  operation: InstanceOperation,
  replayed: boolean,
): string {
  const label =
    operation === "create"
      ? "Spawn"
      : operation === "extend"
        ? "Extension"
        : "Destruction";
  return replayed
    ? `${label} replayed an earlier identical request.`
    : `${label} accepted by the backend.`;
}
