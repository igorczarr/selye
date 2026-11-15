import { Suspense } from "react";
import { AuthSkeleton } from "@/components/auth/auth-shell";
import { LoginView } from "@/components/auth/login-view";

export const instant = false;

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
