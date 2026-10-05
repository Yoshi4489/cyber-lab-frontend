import type { Metadata } from "next";
import { CatalogLoader } from "@/features/catalog/loader";

export const metadata: Metadata = { title: "Explore labs" };

export default function LabsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
          <h1>Find your next discovery.</h1>
          <p>
            Explore the published labs, at your own pace.
          </p>
        </div>
      </div>
      <CatalogLoader />
    </>
  );
}
