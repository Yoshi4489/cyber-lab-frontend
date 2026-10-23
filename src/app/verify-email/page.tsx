import { AuthForm } from "@/features/auth/form";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { AccountNotice } from "@/features/learner/account-notice";
export const metadata = { title: "Verify email", referrer: "no-referrer" as const };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (getFrontendMode() === "preview") return <AccountNotice />;
  const { token } = await searchParams;
  return <AuthForm mode={token ? "verification-confirm" : "verification-request"} token={token} />;
}
