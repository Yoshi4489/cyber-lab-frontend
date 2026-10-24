import { describe, expect, it } from "vitest";
import { categories, labs } from "../../src/features/catalog/data";
import { emptyLearner, progressFor, readLearner, type Learner } from "../../src/features/learner/model";
import { rankings } from "../../src/features/leaderboard/rankings";

const now = new Date(2026, 9, 24, 12).getTime();
const first = labs[0]!;
const second = labs[1]!;
const third = labs[2]!;
const learner = (completions: Record<string, number>, username = "progress_owl"): Learner => ({
  ...emptyLearner, username, signedIn: true, completions,
});

describe("shared illustrative progress", () => {
  it("starts with consistent empty totals, topics and locked milestones", () => {
    const progress = progressFor(emptyLearner, now);
    expect(progress).toMatchObject({ xp: 0, level: 1, completedCount: 0, totalLabs: 12, earnedBadges: 0, streak: 0, today: false });
    expect(progress.topics.map(topic => topic.category)).toEqual(categories.slice(1));
    expect(progress.topics.every(topic => topic.completed === 0 && topic.total > 0)).toBe(true);
    expect(progress.badges.every(badge => !badge.earned)).toBe(true);
  });

  it("derives all displays only from known completions with valid timestamps", () => {
    const state = learner({ [first.slug]: now, [second.slug]: -1, [third.slug]: NaN, unknown: now });
    const progress = progressFor(state, now);
    expect(progress).toMatchObject({ xp: first.points, completedCount: 1, earnedBadges: 1, today: true, streak: 1 });
    expect(progress.completedLabs.map(lab => lab.slug)).toEqual([first.slug]);
    const current = rankings(state).find(entry => entry.current);
    expect(current).toMatchObject({ xp: progress.xp, completed: progress.completedCount, level: progress.level });
  });

  it("orders recent completions consistently and retains their original dates", () => {
    const state = learner({ [first.slug]: now - 1000, [second.slug]: now, [third.slug]: now });
    const expected = [second.slug, third.slug].sort((a, b) => a.localeCompare(b));
    expect(progressFor(state, now).completedLabs.map(lab => lab.slug)).toEqual([...expected, first.slug]);
    expect(progressFor(state, now).completedLabs.at(-1)?.completedAt).toBe(now - 1000);
  });

  it("unlocks the existing five-lab and all-topic milestones from the same completions", () => {
    const selected = categories.slice(1).map(category => labs.find(lab => lab.category === category)!);
    const progress = progressFor(learner(Object.fromEntries(selected.map(lab => [lab.slug, now]))), now);
    const xp = selected.reduce((sum, lab) => sum + lab.points, 0);
    expect(progress).toMatchObject({ xp, level: Math.floor(xp / 500) + 1, completedCount: 5, earnedBadges: 3 });
    expect(progress.topics.every(topic => topic.completed === 1)).toBe(true);
  });

  it("calculates the daily goal and streak from valid local calendar days", () => {
    const yesterday = new Date(2026, 9, 23, 12).getTime();
    const before = new Date(2026, 9, 22, 12).getTime();
    const state = learner({ [first.slug]: yesterday, [second.slug]: before });
    expect(progressFor(state, now)).toMatchObject({ today: false, streak: 2 });
    expect(progressFor({ ...state, completions: { ...state.completions, [third.slug]: now } }, now)).toMatchObject({ today: true, streak: 3 });
  });

  it("gives tied XP the same rank and keeps a duplicate fictional username distinct", () => {
    const entries = rankings(learner({ "cookie-monster": now }, "hello_otter"));
    const sameName = entries.filter(entry => entry.name === "hello_otter");
    expect(sameName).toHaveLength(2);
    expect(sameName.map(entry => entry.id).sort()).toEqual(["current-demo", "otter"]);
    expect(sameName.every(entry => entry.rank === 7 && entry.xp === 100)).toBe(true);
    expect(sameName.filter(entry => entry.current)).toHaveLength(1);
  });

  it("retains normalized progress after sign-out without adding a current ranking row", () => {
    const signedOut = readLearner(JSON.stringify({ ...learner({ "cookie-monster": now }), signedIn: false }));
    expect(progressFor(signedOut, now).xp).toBe(100);
    expect(rankings(signedOut)).toHaveLength(7);
    expect(rankings(signedOut).some(entry => entry.current)).toBe(false);
  });

  it("counts all editorial samples exactly once and returns empty progress after reset", () => {
    const state = learner(Object.fromEntries(labs.map(lab => [lab.slug, now])));
    const progress = progressFor(readLearner(JSON.stringify(state)), now);
    expect(progress.completedCount).toBe(labs.length);
    expect(progress.xp).toBe(labs.reduce((sum, lab) => sum + lab.points, 0));
    expect(progress.topics.every(topic => topic.completed === topic.total)).toBe(true);
    expect(progressFor(emptyLearner, now).completedLabs).toEqual([]);
  });
});
