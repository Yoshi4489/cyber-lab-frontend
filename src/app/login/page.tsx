import { AuthForm } from "@/features/auth/form";
export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="login" destination={(await searchParams).next} />;
}
