import { AuthForm } from "@/features/auth/form";
export const metadata = { title: "Password recovery" };
export default function ForgotPasswordPage() { return <AuthForm mode="reset-request" />; }
