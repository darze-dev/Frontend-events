import { AppShell } from "@/components/app-shell";
import { AssistantChat } from "@/components/assistant-chat";
import { AuthProvider } from "@/components/auth-provider";

// Todas las pantallas dentro de (app) exigen sesión y llevan el menú lateral y la barra superior.
// El login queda fuera de este grupo, así se ve a pantalla completa.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
      <AssistantChat />
    </AuthProvider>
  );
}
