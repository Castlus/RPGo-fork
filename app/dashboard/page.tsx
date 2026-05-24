import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

// Placeholder do dashboard — Fase 2 substitui pela lista de personagens/mesas.
// Mantido aqui só pra validar o fluxo de login/logout da Fase 1.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "var(--primary)", fontSize: "2rem" }}>Dashboard</h1>
      <p style={{ color: "var(--text-sec)" }}>
        Logado como <strong style={{ color: "var(--text-main)" }}>{user.email}</strong>
      </p>
      <p style={{ color: "var(--text-sec)", fontSize: "0.9rem", maxWidth: "30rem" }}>
        Tela em construção. Próxima fase porta a lista de personagens e mesas.
      </p>
      <LogoutButton />
    </main>
  );
}
