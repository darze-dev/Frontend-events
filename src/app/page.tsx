import { redirect } from "next/navigation";

// La entrada al sistema es el inicio de sesión.
export default function Home() {
  redirect("/login");
}
