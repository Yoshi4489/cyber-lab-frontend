"use client";
import { requestBff } from "@/features/backend/client";
import { catalogSchema } from "@/features/backend/catalog-schemas";
export function readCatalog(signal?: AbortSignal) { return requestBff("/api/catalog", catalogSchema, 200, { signal }); }
