"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  emptyLearner,
  readLearner,
  usernameSchema,
  type Learner,
} from "./model";

export const LEARNER_KEY = "ciscoku:learner:v1";
const changeEvent = "ciscoku:learner-change";
let fallback: string | null = null;
let storageUnavailable = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
function snapshot() {
  if (storageUnavailable) return fallback;
  try {
    return window.localStorage.getItem(LEARNER_KEY);
  } catch {
    return fallback;
  }
}
function write(next: Learner) {
  const raw = JSON.stringify(next);
  fallback = raw;
  try {
    window.localStorage.setItem(LEARNER_KEY, raw);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
  window.dispatchEvent(new Event(changeEvent));
}
export function updateLearner(update: (current: Learner) => Learner) {
  write(update(readLearner(snapshot())));
}
const serverSnapshot = () => null;
const readySnapshot = () => true;
const notReady = () => false;
const storageError = () => storageUnavailable;
export function useLearner() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, readySnapshot, notReady);
  const temporary = useSyncExternalStore(subscribe, storageError, notReady);
  const learner = useMemo(() => readLearner(raw), [raw]);
  return { learner, ready, temporary };
}
export function enterDemo(name: string) {
  const parsed = usernameSchema.safeParse(name);
  if (!parsed.success) return false;
  updateLearner((current) => ({
    ...(current.username === parsed.data ? current : emptyLearner),
    username: parsed.data,
    signedIn: true,
  }));
  return true;
}
export function leaveDemo() {
  updateLearner((current) => ({ ...current, signedIn: false, sessions: {} }));
}
export function resetDemo() {
  write(emptyLearner);
}
