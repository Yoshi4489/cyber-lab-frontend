import { z } from "zod";
import { categories, getLab, labs } from "@/features/catalog/data";
import { previewSessionSchema, previewCommandRecordSchema, isValidPreviewSession } from "@/features/session/preview-model";

const username = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const usernameSchema = username;
const timestamp = z.number().finite().nonnegative().max(8.64e15);
const identitySchema = z.object({
  username: username.nullable(),
  signedIn: z.boolean(),
  completions: z.record(z.string(), z.unknown()),
});
export const learnerSchema = identitySchema.extend({
  version: z.literal(2),
  identityEpoch: z.uuid().nullable().default(null),
  activeSession: previewSessionSchema.nullable().catch(null),
  lastSession: previewSessionSchema.nullable().catch(null),
  commands: z.record(z.string(), previewCommandRecordSchema).catch({}),
});
const legacySchema = identitySchema.extend({ version: z.literal(1) });
export type Learner = Omit<z.infer<typeof learnerSchema>, "completions"> & { completions: Record<string, number> };
export const emptyLearner: Learner = {
  version: 2,
  identityEpoch: null,
  username: null,
  signedIn: false,
  completions: {},
  activeSession: null,
  lastSession: null,
  commands: {},
};

export function readLearner(raw: string | null): Learner {
  try {
    const input = JSON.parse(raw ?? "null");
    const result = input?.version === 1 ? legacySchema.safeParse(input) : learnerSchema.safeParse(input);
    if (!result.success) return emptyLearner;
    const data = result.data;
    return {
      ...emptyLearner,
      username: data.username,
      signedIn: Boolean(data.signedIn && data.username),
      completions: Object.fromEntries(
        Object.entries(data.completions).flatMap(([slug, time]) => {
          const parsed = timestamp.safeParse(time);
          return getLab(slug) && parsed.success ? [[slug, parsed.data]] : [];
        }),
      ),
      ...("activeSession" in data && data.signedIn && data.username ? {
        identityEpoch: data.identityEpoch,
        activeSession: data.activeSession && isValidPreviewSession(data.activeSession, data.username)
          && ["pending", "provisioning", "running", "stopping"].includes(data.activeSession.instance.status) ? data.activeSession : null,
        lastSession: data.lastSession && isValidPreviewSession(data.lastSession, data.username)
          && ["stopped", "failed", "expired"].includes(data.lastSession.instance.status) ? data.lastSession : null,
        commands: data.commands,
      } : {}),
    };
  } catch {
    return emptyLearner;
  }
}

export function totalXp(learner: Learner) {
  return labs.reduce(
    (sum, lab) =>
      sum + (learner.completions[lab.slug] !== undefined ? lab.points : 0),
    0,
  );
}

// Illustrative reward rules for the UX preview; not a production scoring policy.
export const XP_PER_LEVEL = 500;
export function levelFor(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function localDay(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
export function activity(learner: Learner, now: number) {
  const days = new Set(Object.values(learner.completions).map(localDay));
  const cursor = new Date(now);
  const today = days.has(localDay(now));
  if (!today) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { today, streak };
}
export function badgesFor(learner: Learner) {
  const completed = labs.filter(
    (lab) => learner.completions[lab.slug] !== undefined,
  );
  return [
    {
      name: "First step",
      description: "Finish your first demo lab",
      earned: completed.length >= 1,
    },
    {
      name: "Finding your flow",
      description: "Finish 5 different demo labs",
      earned: completed.length >= 5,
    },
    {
      name: "Curious mind",
      description: "Try all 5 topic categories",
      earned: new Set(completed.map((lab) => lab.category)).size >= 5,
    },
  ];
}

export function completedLabsFor(learner: Learner) {
  return labs.flatMap(lab => {
    const completedAt = timestamp.safeParse(learner.completions[lab.slug]);
    return completedAt.success ? [{ ...lab, completedAt: completedAt.data }] : [];
  }).sort((a, b) => b.completedAt - a.completedAt || a.slug.localeCompare(b.slug));
}

// Every progress screen derives its display from the same known completions.
// These are illustrative rewards, never a backend profile or scoring record.
export function progressFor(learner: Learner, now: number) {
  const completedLabs = completedLabsFor(learner);
  const normalized = { ...learner, completions: Object.fromEntries(completedLabs.map(lab => [lab.slug, lab.completedAt])) };
  const xp = completedLabs.reduce((sum, lab) => sum + lab.points, 0);
  const badges = badgesFor(normalized);
  return {
    xp, level: levelFor(xp), completedLabs, completedCount: completedLabs.length,
    totalLabs: labs.length, badges, earnedBadges: badges.filter(badge => badge.earned).length,
    ...activity(normalized, now),
    topics: categories.filter(category => category !== "All labs").map(category => ({
      category, completed: completedLabs.filter(lab => lab.category === category).length,
      total: labs.filter(lab => lab.category === category).length,
    })),
  };
}
export type LearnerProgress = ReturnType<typeof progressFor>;
