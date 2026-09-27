// Loopback-only test double; no lab runtime or credentials are involved.
import { createServer } from "node:http";
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
  const requests = [];
  const server = createServer(async (request, response) => {
    const requestUrl = request.url ?? "/";
    if (request.method === "POST" && requestUrl.startsWith("/scenario/")) {
      scenario = requestUrl.slice("/scenario/".length);
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
        sendJson(response, 200, { ...resolvedSession, sessionToken });
        return;
      }
      if (requestUrl === "/v1/auth/session") {
        sendJson(response, 200, resolvedSession);
        return;
      }
      if (requestUrl === "/v1/auth/logout") {
        response.writeHead(204).end();
        return;
      }
    }

    if (requestUrl.startsWith("/v1/instances")) {
      const requiredScope = request.method === "GET" ? "instances:read" : "instances:write";
      if (!(await hasServiceToken(request, requiredScope, serviceToken, serviceTokenConfig))) {
        sendJson(response, 401, {
          code: "UNAUTHORIZED",
          message: "Invalid service token.",
          correlationId,
        });
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
      sendJson(response, 200, { challenges: [challenge], source: "database" });
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
        sendJson(response, 200, challenge);
      }
      return;
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
  allowedScopes: ["instances:read", "instances:write", "submissions:write"],
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
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return false;

  const token = authorization.slice("Bearer ".length);
  if (!config) return token === fallbackToken;

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
    return (
      protectedHeader.typ === "JWT" &&
      payload.sub === resolvedSession.user.id &&
      payload.sid === resolvedSession.sessionId &&
      payload.scope === requiredScope
    );
  } catch {
    return false;
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
  fixture.server.listen(4101, "127.0.0.1");
  process.on("SIGTERM", () => fixture.server.close());
  process.on("SIGINT", () => fixture.server.close());
}
