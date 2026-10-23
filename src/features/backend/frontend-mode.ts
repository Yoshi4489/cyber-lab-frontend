import "server-only";

export type FrontendMode = "preview" | "live";

// Only deployment configuration can enable live services. Unknown values fail
// closed into the preview, including when backend credentials are present.
export function getFrontendMode(): FrontendMode {
  return process.env.FRONTEND_MODE === "live" ? "live" : "preview";
}

export function previewApiResponse(): Response | null {
  if (getFrontendMode() === "live") return null;
  return Response.json({ code: "NOT_FOUND" }, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
