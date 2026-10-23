import { AuthForm } from "@/features/auth/form";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { AccountNotice } from "@/features/learner/account-notice";
export const metadata = { title: "Reset password", referrer: "no-referrer" as const };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (getFrontendMode() === "preview") return <AccountNotice />;
  return <AuthForm mode="reset-confirm" token={(await searchParams).token} />;
}
