import { Suspense } from "react";
import { AuthSkeleton } from "@/components/auth/auth-shell";
import { SignUpView } from "@/components/auth/signup-view";

export const instant = false;

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <SignUpView />
    </Suspense>
  );
}
