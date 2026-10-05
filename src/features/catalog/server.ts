import "server-only";
import { cache } from "react";
import { getBackendChallenge } from "@/features/backend/adapter";
export const readChallenge = cache(getBackendChallenge);
