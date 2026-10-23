import { AuthForm } from "@/features/auth/form";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { Signup } from "@/features/learner/signup";
export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return getFrontendMode() === "preview"
    ? <Signup destination={next ?? "/dashboard"} />
    : <AuthForm mode="login" destination={next} />;
}
