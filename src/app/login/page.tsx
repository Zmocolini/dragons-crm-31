import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-fg-dim">Se încarcă…</div>}>
      <LoginForm />
    </Suspense>
  );
}
