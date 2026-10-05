import { redirect } from "next/navigation";

// Conturile se gestionează acum în Subcontractori → „Conturi și invitații".
export default function UtilizatoriPage() {
  redirect("/subcontractori");
}
