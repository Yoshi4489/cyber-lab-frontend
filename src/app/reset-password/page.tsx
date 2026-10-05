import { AuthForm } from "@/features/auth/form";
export const metadata = { title: "Reset password", referrer: "no-referrer" as const };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <AuthForm mode="reset-confirm" token={(await searchParams).token} />;
}
