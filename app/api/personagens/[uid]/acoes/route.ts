import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handlePrismaError,
  readJson,
  requirePersonagemAccess,
  requireUser,
} from "@/lib/api-utils";

type Params = { params: Promise<{ uid: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  try {
    const acoes = await prisma.acao.findMany({
      where: { personagemId: uid },
    });
    return NextResponse.json(acoes);
  } catch (e) {
    return handlePrismaError(e);
  }
}

type CreateBody = {
  nome?: string;
  descricao?: string;
  tipo?: string;
  tag?: string;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  const body = await readJson<CreateBody>(request);
  const nome = body?.nome?.trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const acao = await prisma.acao.create({
      data: {
        personagemId: uid,
        nome,
        descricao: body?.descricao || "",
        tipo: body?.tipo || "padrao",
        tag: body?.tag || "",
      },
    });
    return NextResponse.json(acao, { status: 201 });
  } catch (e) {
    return handlePrismaError(e);
  }
}
