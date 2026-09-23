import { redirect } from "next/navigation";

// Register dezactivat: accesul se acordă exclusiv de admin. Toate cererile → /login.
export default function RegisterPage() {
  redirect("/login");
}
