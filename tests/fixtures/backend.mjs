// Loopback-only test double; no lab runtime or credentials are involved.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { backendFixtureAddress } from "./backend-origin.mjs";
import { jwtVerify } from "jose";

const correlationId = "d48b142b-4929-44e9-8ac5-153771f475a4";
const challenge = {
  id: "f5d66313-2997-45af-94d7-8bcad4d9fd4f",
  slug: "intro-web",
  title: "Intro Web",
  summary: "A loopback-only catalog fixture.",
  category: "web",
  difficulty: "easy",
  points: 100,
  kind: "web",
  tags: ["http", "intro"],
};
const welcomeFlag = "FLAG{WELCOME_TO_CISCO_FAMILY}";
const welcomeChallenge = { ...challenge, id: "88888888-8888-4888-8888-888888888888", slug: "welcome", title: "Welcome", summary: "A harmless introduction to your learning workspace.", points: 10, tags: ["introduction", "getting-started"] };

/**
 * @param {{
 *   bffAuthSecret?: string,
 *   serviceToken?: string,
 *   serviceTokenSecret?: string,
 *   serviceTokenIssuer?: string,
 *   serviceTokenAudience?: string,
 * }} [options]
 */
export function createBackendFixture({
  bffAuthSecret = "",
  serviceToken = "header.payload.signature",
  serviceTokenSecret,
  serviceTokenIssuer,
  serviceTokenAudience,
} = {}) {
  const serviceTokenConfig = parseServiceTokenConfig({
    secret: serviceTokenSecret,
    issuer: serviceTokenIssuer,
    audience: serviceTokenAudience,
  });
  let scenario = "healthy";
  let liveInstance = null;
  const welcomeSessions = new Map();
  const welcomeInstances = new Map();
  const welcomeMutations = new Map();
  const welcomeSolves = new Map();
  const acceptedMutations = new Map();
  const requests = [];
  const server = createServer(async (request, response) => {
    const requestUrl = request.url ?? "/";
    if (request.method === "POST" && requestUrl.startsWith("/scenario/")) {
      scenario = requestUrl.slice("/scenario/".length);
      liveInstance = null;
      welcomeSessions.clear();
      welcomeInstances.clear();
      welcomeMutations.clear();
      welcomeSolves.clear();
      acceptedMutations.clear();
      response.writeHead(204).end();
      return;
    }

    if (request.method === "GET" && requestUrl === "/requests") {
      sendJson(response, 200, { requests });
      return;
    }

    const body = await readRequestBody(request);
    requests.push({
      method: request.method,
      url: requestUrl,
      headers: redactHeaders(request.headers),
      body: redactBody(requestUrl, body),
    });

    if (scenario === "redirect") {
      response.writeHead(302, { Location: "/redirected" }).end();
      return;
    }
    if (scenario === "non-json") {
      response.writeHead(200, { "Content-Type": "text/plain" }).end("not json");
      return;
    }
    if (scenario === "error") {
      sendJson(response, 429, {
        code: "RATE_LIMITED",
        message: "Try again later.",
        correlationId,
      });
      return;
    }
    if (scenario === "invalid-error") {
      sendJson(response, 503, { internal: "Do not expose this upstream body" });
      return;
    }
    if (scenario === "invalid") {
      sendJson(response, 200, { unexpected: true });
      return;
    }

    if (scenario === "instance-url-before-running" && requestUrl.startsWith("/v1/instances/")) {
      sendJson(response, 200, { ...pendingInstance, url: "https://lab.example.test" });
      return;
    }

    if (request.method === "POST" && requestUrl.startsWith("/v1/auth/")) {
      if (request.headers.authorization !== `Bearer ${bffAuthSecret}`) {
        sendJson(response, 401, {
          code: "UNAUTHORIZED",
          message: "Invalid BFF credential.",
          correlationId,
        });
        return;
      }
      if (requestUrl === "/v1/auth/login") {
        if (scenario.startsWith("welcome")) {
          const input = JSON.parse(body);
          if (!["learner@example.test", "learner-b@example.test"].includes(input.email) || input.password !== "correct-horse-battery-staple") {
            sendJson(response, 401, { code: "UNAUTHORIZED", message: "Invalid credentials.", correlationId }); return;
          }
          const second = input.email === "learner-b@example.test";
          const token = (second ? "B" : "A").repeat(43);
          const session = second ? { ...resolvedSession, sessionId: "9b075fdc-7e4e-4b9f-b59b-7e82bd45f484", user: { ...resolvedSession.user, id: "f9e453ee-f3b2-4ff5-bc06-9686e53da379", email: input.email, displayName: "Second Learner" } } : resolvedSession;
          welcomeSessions.set(token, session);
          sendJson(response, 200, { ...session, sessionToken: token }); return;
        }
        sendJson(response, 200, { ...resolvedSession, sessionToken });
        return;
      }
      if (requestUrl === "/v1/auth/session") {
        if (scenario.startsWith("welcome")) {
          const session = welcomeSessions.get(JSON.parse(body).sessionToken);
          if (!session) { sendJson(response, 401, { code: "UNAUTHORIZED", message: "Invalid session.", correlationId }); return; }
          sendJson(response, 200, session); return;
        }
        sendJson(response, 200, resolvedSession);
        return;
      }
      if (["/v1/auth/verification/request", "/v1/auth/password-reset/request"].includes(requestUrl)) {
        sendJson(response, 202, { accepted: true });
        return;
      }
      if (["/v1/auth/verification/confirm", "/v1/auth/password-reset/confirm"].includes(requestUrl)) {
        response.writeHead(204).end();
        return;
      }
      if (requestUrl === "/v1/auth/logout") {
        if (scenario.startsWith("welcome")) welcomeSessions.delete(JSON.parse(body).sessionToken);
        response.writeHead(204).end();
        return;
      }
    }

    if (requestUrl.startsWith("/v1/instances")) {
      const requiredScope = request.method === "GET" ? "instances:read" : "instances:write";
      const actor = await serviceActor(request, requiredScope, serviceToken, serviceTokenConfig, scenario.startsWith("welcome") ? [...welcomeSessions.values()] : [resolvedSession]);
      if (!actor) {
        sendJson(response, 401, {
          code: "UNAUTHORIZED",
          message: "Invalid service token.",
          correlationId,
        });
        return;
      }
      if (scenario.startsWith("welcome")) {
        let input;
        try { input = body ? JSON.parse(body) : null; } catch { input = null; }
        const create = request.method === "POST" && requestUrl === "/v1/instances";
        const id = create ? null : requestUrl.split("/")[3];
        let owned = id ? welcomeInstances.get(id) : null;
        if (!create && (!owned || owned.owner !== actor)) { sendJson(response, 404, { code: "NOT_FOUND", message: "Fixture error.", correlationId }); return; }
        const operation = create ? "create" : request.method === "DELETE" ? "destroy" : "extend";
        const key = `${actor}:${operation}:${request.headers["idempotency-key"]}`;
        const fingerprint = create ? input?.challengeId : id;
        const previous = welcomeMutations.get(key);
        if (request.method !== "GET" && previous) {
          if (previous.fingerprint !== fingerprint) { sendJson(response, 409, { code: "CONFLICT", message: "Fixture error.", correlationId }); return; }
          sendJson(response, 202, { instance: welcomeInstances.get(previous.instanceId).instance, operationId: previous.operationId, replayed: true }); return;
        }
        if (create) {
          if (input?.challengeId !== welcomeChallenge.id) { sendJson(response, 404, { code: "NOT_FOUND", message: "Fixture error.", correlationId }); return; }
          if ([...welcomeInstances.values()].some(value => value.owner === actor && ["pending", "provisioning", "running", "stopping"].includes(value.instance.status))) { sendJson(response, 409, { code: "CONFLICT", message: "Fixture error.", correlationId }); return; }
          const now = Date.now();
          owned = { owner: actor, instance: { ...pendingInstance, id: randomUUID(), challengeId: welcomeChallenge.id, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), absoluteExpiresAt: new Date(now + 7200000).toISOString() } };
          welcomeInstances.set(owned.instance.id, owned);
        } else if (request.method === "GET") {
          if (scenario === "welcome-capacity" && owned.instance.status === "pending") owned.instance = { ...owned.instance, status: "failed", failureCode: "node_capacity_exhausted", stoppedAt: new Date().toISOString() };
          else if (owned.instance.status === "pending") owned.instance = { ...owned.instance, status: "provisioning" };
          else if (owned.instance.status === "provisioning") owned.instance = { ...owned.instance, status: "running", startedAt: new Date().toISOString(), url: `https://welcome.example.test/labs/${owned.instance.id}/` };
          else if (owned.instance.status === "stopping") owned.instance = { ...owned.instance, status: "stopped", stoppedAt: new Date().toISOString() };
          sendJson(response, 200, owned.instance); return;
        } else if (request.method === "DELETE") {
          const withoutTarget = { ...owned.instance }; delete withoutTarget.url;
          if (["pending", "provisioning", "running"].includes(owned.instance.status)) owned.instance = { ...withoutTarget, status: "stopping" };
        } else if (request.method === "POST" && requestUrl.endsWith("/extend")) {
          if (owned.instance.status !== "running" || Date.parse(owned.instance.expiresAt) <= Date.now()) { sendJson(response, 409, { code: "CONFLICT", message: "Fixture error.", correlationId }); return; }
          owned.instance = { ...owned.instance, expiresAt: new Date(Math.min(Date.parse(owned.instance.expiresAt) + 1800000, Date.parse(owned.instance.absoluteExpiresAt))).toISOString() };
        } else { sendJson(response, 404, { code: "NOT_FOUND", message: "Fixture error.", correlationId }); return; }
        const operationId = randomUUID();
        welcomeMutations.set(key, { instanceId: owned.instance.id, operationId, fingerprint });
        sendJson(response, 202, { instance: owned.instance, operationId, replayed: false }); return;
      }
      if (scenario === "lifecycle") {
        const key = `${request.method}:${requestUrl}:${request.headers["idempotency-key"]}`;
        if (request.method !== "GET" && acceptedMutations.has(key)) {
          sendJson(response, 202, { ...acceptedMutations.get(key), replayed: true });
          return;
        }
        if (request.method === "POST" && requestUrl === "/v1/instances") {
          const now = Date.now();
          liveInstance = { ...pendingInstance, createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 3600000).toISOString(),
            absoluteExpiresAt: new Date(now + 7200000).toISOString() };
        } else if (!liveInstance || !requestUrl.startsWith(`/v1/instances/${liveInstance.id}`)) {
          sendJson(response, 404, { code: "NOT_FOUND", message: "Unavailable instance.", correlationId });
          return;
        } else if (request.method === "GET") {
          if (liveInstance.status === "pending") liveInstance = { ...liveInstance, status: "running", startedAt: new Date().toISOString(), url: "https://lab.example.test" };
          if (liveInstance.status === "stopping") liveInstance = { ...liveInstance, status: "stopped", stoppedAt: new Date().toISOString() };
          sendJson(response, 200, liveInstance);
          return;
        } else if (request.method === "DELETE") {
          const withoutTarget = { ...liveInstance };
          delete withoutTarget.url;
          liveInstance = { ...withoutTarget, status: "stopping" };
        } else if (request.method === "POST" && requestUrl.endsWith("/extend")) {
          liveInstance = { ...liveInstance, expiresAt: new Date(Math.min(Date.parse(liveInstance.expiresAt) + 1800000, Date.parse(liveInstance.absoluteExpiresAt))).toISOString() };
        }
        const accepted = { ...instanceMutation, instance: liveInstance };
        acceptedMutations.set(key, accepted);
        sendJson(response, 202, accepted);
        return;
      }
      if (request.method === "POST" && requestUrl === "/v1/instances") {
        sendJson(response, 202, instanceMutation);
        return;
      }
      if (request.method === "GET" && requestUrl === `/v1/instances/${pendingInstance.id}`) {
        sendJson(response, 200, pendingInstance);
        return;
      }
      if (
        request.method === "POST" &&
        requestUrl === `/v1/instances/${pendingInstance.id}/extend`
      ) {
        sendJson(response, 202, instanceMutation);
        return;
      }
      if (request.method === "DELETE" && requestUrl === `/v1/instances/${pendingInstance.id}`) {
        sendJson(response, 202, instanceMutation);
        return;
      }
    }

    if (scenario.startsWith("welcome") && (requestUrl === "/v1/submissions" || requestUrl === "/v1/profile")) {
      const submission = request.method === "POST" && requestUrl === "/v1/submissions";
      const actor = await serviceActor(request, submission ? "submissions:write" : "profile:read", serviceToken, serviceTokenConfig, [...welcomeSessions.values()]);
      if (!actor) { sendJson(response, 401, { code: "UNAUTHORIZED", message: "Fixture error.", correlationId }); return; }
      if (submission) {
        let input;
        try { input = JSON.parse(body); } catch { input = null; }
        const owned = welcomeInstances.get(input?.instanceId);
        // Mirrors the backend: owner, challenge match, running and unexpired.
        if (!owned || owned.owner !== actor || owned.instance.challengeId !== input?.challengeId || owned.instance.status !== "running" || Date.parse(owned.instance.expiresAt) <= Date.now()) {
          sendJson(response, 404, { code: "NOT_FOUND", message: "Fixture error.", correlationId }); return;
        }
        const correct = typeof input.flag === "string" && input.flag.trim() === welcomeFlag;
        const first = correct && !welcomeSolves.has(actor);
        if (first) welcomeSolves.set(actor, new Date().toISOString());
        sendJson(response, 200, { correct, points: first ? welcomeChallenge.points : 0, recorded: true, source: "database" }); return;
      }
      const session = [...welcomeSessions.values()].find(value => value.user.id === actor);
      const solvedAt = welcomeSolves.get(actor);
      sendJson(response, 200, {
        userId: actor, displayName: session.user.displayName, bio: null,
        totalPoints: solvedAt ? welcomeChallenge.points : 0, solvedCount: solvedAt ? 1 : 0, availableChallenges: 1,
        solves: solvedAt ? [{ challengeId: welcomeChallenge.id, slug: welcomeChallenge.slug, title: welcomeChallenge.title, points: welcomeChallenge.points, solvedAt }] : [],
      }); return;
    }

    if (request.method === "POST" && requestUrl === "/v1/submissions") {
      if (
        !(await hasServiceToken(
          request,
          "submissions:write",
          serviceToken,
          serviceTokenConfig,
        ))
      ) {
        sendJson(response, 401, {
          code: "UNAUTHORIZED",
          message: "Invalid service token.",
          correlationId,
        });
        return;
      }
      sendJson(response, 200, {
        correct: true,
        points: 100,
        recorded: true,
        source: "database",
      });
      return;
    }

    if (requestUrl === "/healthz") {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (requestUrl === "/v1/categories") {
      sendJson(response, 200, { categories: ["web", "crypto"] });
      return;
    }
    if (requestUrl === "/v1/challenges") {
      sendJson(response, 200, { challenges: scenario === "empty-catalog" ? [] : [scenario.startsWith("welcome") ? welcomeChallenge : challenge], source: "database" });
      return;
    }
    if (requestUrl.startsWith("/v1/challenges/")) {
      if (requestUrl === "/v1/challenges/missing") {
        sendJson(response, 404, {
          code: "NOT_FOUND",
          message: "Challenge not found.",
          correlationId,
        });
      } else {
        sendJson(response, 200, scenario.startsWith("welcome") ? welcomeChallenge : challenge);
      }
      return;
    }
    if (requestUrl === "/v1/leaderboard" && scenario.startsWith("welcome")) {
      const sessions = [...welcomeSessions.values()];
      const entries = [...welcomeSolves.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, solvedAt], index) => ({
        rank: index + 1, displayName: sessions.find(value => value.user.id === id)?.user.displayName ?? "Learner",
        totalPoints: welcomeChallenge.points, solvedCount: 1, lastSolvedAt: solvedAt,
      }));
      sendJson(response, 200, { entries, source: "database" }); return;
    }
    if (requestUrl === "/v1/leaderboard") {
      sendJson(response, 200, {
        entries: [
          {
            rank: 1,
            displayName: "Loopback Learner",
            totalPoints: 100,
            solvedCount: 1,
            lastSolvedAt: "2026-09-22T00:00:00.000Z",
          },
        ],
        source: "database",
      });
      return;
    }

    response.writeHead(404).end();
  });

  return {
    server,
    setScenario(nextScenario) {
      scenario = nextScenario;
    },
    requests() {
      return [...requests];
    },
  };
}

const sessionToken = "A".repeat(43);
const resolvedSession = {
  sessionId: "943eced9-5a8e-4160-80c5-ef9021aab53f",
  user: {
    id: "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28",
    email: "learner@example.test",
    displayName: "Loopback Learner",
    role: "player",
    emailVerified: true,
  },
  allowedScopes: ["instances:read", "instances:write", "submissions:write", "profile:read"],
  idleExpiresAt: "2026-09-22T00:30:00.000Z",
  absoluteExpiresAt: "2026-12-22T00:00:00.000Z",
};
const pendingInstance = {
  id: "7850ac98-88b2-4d2f-953d-3f2d5b204205",
  challengeId: challenge.id,
  status: "pending",
  createdAt: "2026-09-22T00:00:00.000Z",
  startedAt: null,
  expiresAt: "2026-09-22T01:00:00.000Z",
  absoluteExpiresAt: "2026-09-22T02:00:00.000Z",
  stoppedAt: null,
  failureCode: null,
};
const instanceMutation = {
  instance: pendingInstance,
  operationId: "9c690217-87af-4d5c-a3ac-f7d5be946b4d",
  replayed: false,
};

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function parseServiceTokenConfig({ secret, issuer, audience }) {
  const configured = [secret, issuer, audience].filter(Boolean).length;
  if (configured === 0) return null;
  if (configured !== 3 || secret.length < 32) {
    throw new Error("Fixture service-token configuration is incomplete.");
  }
  return { secret, issuer, audience };
}

async function hasServiceToken(request, requiredScope, fallbackToken, config) {
  return Boolean(await serviceActor(request, requiredScope, fallbackToken, config));
}

async function serviceActor(request, requiredScope, fallbackToken, config, sessions = [resolvedSession]) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length);
  if (!config) return token === fallbackToken ? resolvedSession.user.id : null;

  try {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(config.secret),
      {
        algorithms: ["HS256"],
        issuer: config.issuer,
        audience: config.audience,
      },
    );
    return protectedHeader.typ === "JWT" && payload.scope === requiredScope && sessions.some(session => payload.sub === session.user.id && payload.sid === session.sessionId) ? payload.sub : null;
  } catch {
    return null;
  }
}

function redactHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      name === "authorization" ? "[redacted]" : value,
    ]),
  );
}

function redactBody(requestUrl, body) {
  if (!body) return body;

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return body;

  if (requestUrl === "/v1/auth/login") {
    if ("email" in parsed) parsed.email = "[redacted]";
    if ("password" in parsed) parsed.password = "[redacted]";
  }
  if (requestUrl === "/v1/auth/session" || requestUrl === "/v1/auth/logout") {
    if ("sessionToken" in parsed) parsed.sessionToken = "[redacted]";
  }
  if (requestUrl === "/v1/submissions" && "flag" in parsed) {
    parsed.flag = "[redacted]";
  }

  return JSON.stringify(parsed);
}

if (process.env.BACKEND_FIXTURE_LISTEN === "true") {
  const fixture = createBackendFixture({
    bffAuthSecret: process.env.BFF_AUTH_SECRET,
    serviceTokenSecret: process.env.BACKEND_SERVICE_TOKEN_SECRET,
    serviceTokenIssuer: process.env.SERVICE_TOKEN_ISSUER,
    serviceTokenAudience: process.env.SERVICE_TOKEN_AUDIENCE,
  });
  fixture.server.listen(backendFixtureAddress().port, "127.0.0.1");
  process.on("SIGTERM", () => fixture.server.close());
  process.on("SIGINT", () => fixture.server.close());
}
