// Only the fixture port is configurable; test services remain loopback-only.
export function backendFixtureAddress(value = process.env.BACKEND_FIXTURE_PORT ?? "4101") {
  const port = Number(value);
  if (!/^[0-9]{1,5}$/.test(value) || port < 1 || port > 65535) {
    throw new Error("BACKEND_FIXTURE_PORT must be a decimal TCP port between 1 and 65535.");
  }
  return { port, origin: `http://127.0.0.1:${port}` };
}
