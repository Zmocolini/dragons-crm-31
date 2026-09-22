import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-fg-dim">Se încarcă…</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
