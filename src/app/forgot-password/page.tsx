import { AuthForm } from "@/features/auth/form";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { AccountNotice } from "@/features/learner/account-notice";
export const metadata = { title: "Password recovery" };
export default function ForgotPasswordPage() {
  return getFrontendMode() === "preview" ? <AccountNotice /> : <AuthForm mode="reset-request" />;
}
