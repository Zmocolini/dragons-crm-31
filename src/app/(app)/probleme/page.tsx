import { redirect } from "next/navigation";

// Probleme / Suport s-a mutat în AI Copilot (tab).
export default function ProblemePage() {
  redirect("/ai?tab=issues");
}
