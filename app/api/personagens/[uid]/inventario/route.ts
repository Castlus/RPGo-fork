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
    const itens = await prisma.item.findMany({
      where: { personagemId: uid },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(itens);
  } catch (e) {
    return handlePrismaError(e);
  }
}

type CreateBody = {
  nome?: string;
  peso?: number;
  tipo?: string;
  tags?: string;
  descricao?: string;
  dano?: string;
  modificador?: number;
  ca?: number;
  penalidadeDes?: number;
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
    const item = await prisma.item.create({
      data: {
        personagemId: uid,
        nome,
        peso: Number(body?.peso) || 0,
        tipo: body?.tipo || "comum",
        tags: body?.tags || "",
        descricao: body?.descricao || "",
        dano: body?.dano || "",
        modificador: Number(body?.modificador) || 0,
        ca: Number(body?.ca) || 0,
        penalidadeDes: Number(body?.penalidadeDes) || 0,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return handlePrismaError(e);
  }
}
