import "server-only";
import { z } from "zod";

const addressSchema = z.union([z.ipv4(), z.ipv6()]);
const headerNameSchema = z.string().regex(/^[a-z0-9-]{1,64}$/u);

/**
 * The learner address for backend auth rate limits. Next.js forwards
 * browser-supplied `X-Forwarded-For` unchanged, so no header is trusted unless
 * `TRUSTED_CLIENT_IP_HEADER` names one that the deployment's own proxy or host
 * platform overwrites. For an appending proxy the rightmost entry is the one it
 * recorded. Unset, missing or malformed values return undefined, and the
 * backend then uses its stricter shared key.
 */
export function learnerAddress(request: Request): string | undefined {
  const header = headerNameSchema.safeParse(process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase());
  if (!header.success) return undefined;
  const value = request.headers.get(header.data)?.split(",").at(-1)?.trim();
  const parsed = addressSchema.safeParse(value?.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/u, ""));
  return parsed.success ? parsed.data : undefined;
}
