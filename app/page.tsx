// Placeholder da home — será substituído pela tela de login/cadastro na Fase 1.
// A Fase 0 só configura a infra (Next + Prisma + Supabase SSR + middleware).
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "var(--primary)", fontSize: "2.5rem" }}>RPGo</h1>
      <p style={{ color: "var(--text-sec)", maxWidth: "32rem" }}>
        Migração para Next.js em andamento. A aplicação antiga está em{" "}
        <code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4 }}>
          legacy/
        </code>
        . Próxima fase: portar login e cadastro.
      </p>
    </main>
  );
}
