import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, readJson, requireUser } from "@/lib/api-utils";

function gerarCodigoAcesso(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const mesas = await prisma.mesa.findMany({
      where: { userId: auth.user.id },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(mesas);
  } catch (e) {
    return handlePrismaError(e);
  }
}

type CreateBody = { nome?: string; bannerUrl?: string };

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await readJson<CreateBody>(request);
  const nome = body?.nome?.trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome da mesa é obrigatório." }, { status: 400 });
  }

  // Garante unicidade do código — tenta até 5 vezes antes de desistir.
  let codigoAcesso = gerarCodigoAcesso();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.mesa.findUnique({ where: { codigoAcesso } });
    if (!existing) break;
    codigoAcesso = gerarCodigoAcesso();
  }

  try {
    const mesa = await prisma.mesa.create({
      data: {
        userId: auth.user.id,
        nome,
        codigoAcesso,
        bannerUrl: body?.bannerUrl?.trim() || null,
      },
    });
    return NextResponse.json(mesa, { status: 201 });
  } catch (e) {
    return handlePrismaError(e);
  }
}
