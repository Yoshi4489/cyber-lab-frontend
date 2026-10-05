import { listBackendCategories, listBackendChallenges } from "@/features/backend/adapter";
import { backendBffError, bffJson } from "@/features/backend/bff-response";
export async function GET() {
  try {
    const [catalog, categories] = await Promise.all([listBackendChallenges(), listBackendCategories()]);
    return bffJson({ ...catalog, categories: categories.categories });
  } catch (error) { return backendBffError(error); }
}
