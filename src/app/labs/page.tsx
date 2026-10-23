import type { Metadata } from "next";
import { CatalogLoader } from "@/features/catalog/loader";
import { getFrontendMode } from "@/features/backend/frontend-mode";

export const metadata: Metadata = { title: "Explore labs" };

export default function LabsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
          <h1>Find your next discovery.</h1>
          <p>
            {getFrontendMode() === "preview" ? "Explore 12 sample labs, at your own pace. This is a simulated demo." : "Explore the published labs, at your own pace."}
          </p>
        </div>
      </div>
      <CatalogLoader />
    </>
  );
}
