import { AuthForm } from "@/features/auth/form";
export const metadata = { title: "Verify email", referrer: "no-referrer" as const };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthForm mode={token ? "verification-confirm" : "verification-request"} token={token} />;
}
