// Helpers usados pelas Route Handlers da pasta app/api/.
// Centraliza: validação de sessão, checagem de ownership, parsing seguro do
// body e tradução de erros do Prisma pra status HTTP corretos.
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type ApiError = { error: string };
type ErrResp = NextResponse<ApiError>;

function jsonError(message: string, status: number): ErrResp {
  return NextResponse.json({ error: message }, { status });
}

// ─── Auth ───────────────────────────────────────────────────
export async function requireUser(): Promise<
  { user: User } | { user?: never; error: ErrResp }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError("Não autenticado.", 401) };
  return { user };
}

// ─── Personagem: dono OU narrador da mesa ──────────────────
// Inclui a mesa pra evitar refetch nos handlers que precisam dela.
export async function requirePersonagemAccess(
  personagemId: string,
  userId: string,
) {
  const personagem = await prisma.personagem.findUnique({
    where: { id: personagemId },
    include: { mesa: true },
  });
  if (!personagem) return { error: jsonError("Personagem não encontrado.", 404) };

  const isDono = personagem.userId === userId;
  const isNarrador = personagem.mesa?.userId === userId;
  if (!isDono && !isNarrador) return { error: jsonError("Acesso negado.", 403) };

  return { personagem };
}

// ─── Mesa: narrador OU jogador com personagem nessa mesa ──
export async function requireMesaMembro(mesaId: string, userId: string) {
  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
  if (!mesa) return { error: jsonError("Mesa não encontrada.", 404) };

  const isNarrador = mesa.userId === userId;
  let isJogador = false;
  if (!isNarrador) {
    const p = await prisma.personagem.findFirst({
      where: { mesaId, userId },
      select: { id: true },
    });
    isJogador = !!p;
  }

  if (!isNarrador && !isJogador) return { error: jsonError("Acesso negado.", 403) };

  return { mesa, isNarrador };
}

// ─── Parsing seguro do body ────────────────────────────────
export async function readJson<T = unknown>(
  request: Request,
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

// ─── Erros do Prisma → HTTP ────────────────────────────────
// P2002 = unique constraint, P2025 = registro não encontrado (update/delete).
export function handlePrismaError(e: unknown): ErrResp {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return jsonError("Já existe um registro com esse valor.", 409);
    if (e.code === "P2025") return jsonError("Registro não encontrado.", 404);
  }
  const msg = e instanceof Error ? e.message : "Erro interno.";
  return jsonError(msg, 500);
}

// ─── Allow-list de campos pra PATCH ────────────────────────
// Copia só as chaves permitidas do body — evita mass-assignment.
export function pickAllowed<T extends Record<string, unknown>>(
  body: Record<string, unknown> | null,
  allowed: readonly (keyof T)[],
): Partial<T> {
  if (!body) return {};
  const data: Partial<T> = {};
  for (const key of allowed) {
    const v = body[key as string];
    if (v !== undefined) (data as Record<string, unknown>)[key as string] = v;
  }
  return data;
}
