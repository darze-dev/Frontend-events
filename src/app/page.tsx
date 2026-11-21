import { redirect } from "next/navigation";

// La página de inicio lleva directo a Clientes mientras no exista un panel principal.
export default function Home() {
  redirect("/clientes");
}
