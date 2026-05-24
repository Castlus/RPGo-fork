import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, readJson, requireUser } from "@/lib/api-utils";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const personagens = await prisma.personagem.findMany({
      where: { userId: auth.user.id },
      include: { mesa: { select: { id: true, nome: true } } },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(personagens);
  } catch (e) {
    return handlePrismaError(e);
  }
}

type CreateBody = {
  nome?: string;
  hpMax?: number;
  ppMax?: number;
  forca?: number;
  destreza?: number;
  constituicao?: number;
  sabedoria?: number;
  vontade?: number;
  presenca?: number;
};

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await readJson<CreateBody>(request);
  const nome = body?.nome?.trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const hpMax = Number(body?.hpMax) || 0;
  const ppMax = Number(body?.ppMax) || 0;

  try {
    const personagem = await prisma.personagem.create({
      data: {
        userId: auth.user.id,
        nome,
        hpMax,
        hpAtual: hpMax,
        ppMax,
        ppAtual: ppMax,
        nivel: 1,
        forca: Number(body?.forca) || 0,
        destreza: Number(body?.destreza) || 0,
        constituicao: Number(body?.constituicao) || 0,
        sabedoria: Number(body?.sabedoria) || 0,
        vontade: Number(body?.vontade) || 0,
        presenca: Number(body?.presenca) || 0,
      },
    });
    return NextResponse.json(personagem, { status: 201 });
  } catch (e) {
    return handlePrismaError(e);
  }
}
