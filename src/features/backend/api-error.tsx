"use client";
import { apiErrorMessage, type ApiFailure } from "./client";
export function ApiError({ error }: { error: ApiFailure | null }) {
  if (!error) return null;
  return <p role="alert">{apiErrorMessage(error.code)} <small>{error.code}{error.correlationId ? ` · Reference: ${error.correlationId}` : ""}</small></p>;
}
