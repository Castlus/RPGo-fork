import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CopyCodigoBadge } from "./copy-codigo-badge";
import { NarradorRealtime } from "./realtime-refresher";
import "./narrador.css";

type Params = { params: Promise<{ mesaId: string }> };

export default async function NarradorPage({ params }: Params) {
  const { mesaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mesa = await prisma.mesa.findUnique({
    where: { id: mesaId },
    include: {
      personagens: {
        orderBy: { nome: "asc" },
      },
    },
  });
  if (!mesa) notFound();

  if (mesa.userId !== user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="narrador-container">
      <NarradorRealtime mesaId={mesa.id} />

      <div className="painel-central">
        <div className="narrador-topbar">
          <Link href="/dashboard" className="btn-voltar">
            <i className="fas fa-arrow-left" /> Voltar
          </Link>
        </div>

        <header className="mesa-header">
          {mesa.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mesa-banner" src={mesa.bannerUrl} alt="Banner da mesa" />
          )}
          <div className="mesa-info">
            <h1>{mesa.nome}</h1>
            <div className="mesa-acoes">
              <Link
                href={`/calendario/${mesa.id}`}
                className="codigo-badge"
                style={{ textDecoration: "none" }}
              >
                <i className="fas fa-calendar-days" /> Calendário
              </Link>
              <CopyCodigoBadge codigo={mesa.codigoAcesso} />
            </div>
          </div>
        </header>

        <section className="grid-personagens">
          {mesa.personagens.length === 0 ? (
            <p className="empty-msg">
              Nenhum jogador conectado nesta mesa ainda. Compartilhe o código de acesso.
            </p>
          ) : (
            mesa.personagens.map((char) => {
              const pctHp = char.hpMax > 0 ? Math.min((char.hpAtual / char.hpMax) * 100, 100) : 0;
              const pctPp = char.ppMax > 0 ? Math.min((char.ppAtual / char.ppMax) * 100, 100) : 0;
              const avatarSrc =
                char.fotoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${char.id}`;

              return (
                <Link
                  key={char.id}
                  href={`/ficha/${char.id}`}
                  className="char-card-narrador"
                >
                  <div className="char-header">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarSrc} alt={char.nome} className="char-avatar" />
                    <div className="char-title">
                      <h3>{char.nome}</h3>
                      <span>Nível {char.nivel}</span>
                    </div>
                  </div>

                  <div className="bar-group-mini">
                    <div className="bar-label-mini">
                      <span>
                        <i className="fas fa-heart" /> Vida
                      </span>
                      <span>
                        {char.hpAtual} / {char.hpMax}
                      </span>
                    </div>
                    <div className="progress-track-mini">
                      <div
                        className="progress-fill-mini fill-hp"
                        style={{ width: `${pctHp}%` }}
                      />
                    </div>
                  </div>

                  <div className="bar-group-mini">
                    <div className="bar-label-mini">
                      <span>
                        <i className="fas fa-bolt" /> Poder
                      </span>
                      <span>
                        {char.ppAtual} / {char.ppMax}
                      </span>
                    </div>
                    <div className="progress-track-mini">
                      <div
                        className="progress-fill-mini fill-pp"
                        style={{ width: `${pctPp}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </div>

      {/* Bandeja (chat + rolador) entra na Fase 7 */}
      <aside className="bandeja-placeholder">
        <div className="bandeja-placeholder-msg">
          <i className="fas fa-dice-d20" />
          <p>Bandeja em breve</p>
        </div>
      </aside>
    </div>
  );
}
