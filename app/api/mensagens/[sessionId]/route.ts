import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, readJson, requireUser } from "@/lib/api-utils";

type Params = { params: Promise<{ sessionId: string }> };

// GET — últimas 200 mensagens da sessão, ordenadas pelo timestamp crescente.
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { sessionId } = await params;
  try {
    const mensagens = await prisma.mensagem.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
      take: 200,
    });
    return NextResponse.json(mensagens);
  } catch (e) {
    return handlePrismaError(e);
  }
}

type PostBody = {
  nome?: string;
  mensagem?: string;
  tipo?: string;
  total?: number;
  modificador?: number;
  detalhes?: unknown;
};

// POST — cria mensagem ou rolagem na sessão.
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { sessionId } = await params;
  const body = await readJson<PostBody>(request);

  if (!body?.tipo && !body?.mensagem) {
    return NextResponse.json(
      { error: "mensagem é obrigatória para tipo texto." },
      { status: 400 },
    );
  }

  try {
    const nova = await prisma.mensagem.create({
      data: {
        sessionId,
        uid: auth.user.id,
        nome: body?.nome || "Anônimo",
        mensagem: body?.mensagem ?? null,
        tipo: body?.tipo || "texto",
        total: body?.total != null ? Number(body.total) : null,
        modificador: body?.modificador != null ? Number(body.modificador) : null,
        detalhes: (body?.detalhes ?? null) as never,
      },
    });
    return NextResponse.json(nova, { status: 201 });
  } catch (e) {
    return handlePrismaError(e);
  }
}

// DELETE — limpa todas as mensagens da sessão (comando /limpar).
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { sessionId } = await params;
  try {
    const { count } = await prisma.mensagem.deleteMany({ where: { sessionId } });
    return NextResponse.json({ ok: true, deletadas: count });
  } catch (e) {
    return handlePrismaError(e);
  }
}
