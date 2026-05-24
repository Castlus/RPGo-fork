import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, readJson, requireUser } from "@/lib/api-utils";

type JoinBody = { codigo?: string; personagemId?: string };

// POST /api/mesas/join — vincula um personagem do usuário a uma mesa via código.
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await readJson<JoinBody>(request);
  const codigo = body?.codigo?.trim();
  const personagemId = body?.personagemId?.trim();
  if (!codigo || !personagemId) {
    return NextResponse.json(
      { error: "Código e personagemId são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    const personagem = await prisma.personagem.findUnique({ where: { id: personagemId } });
    if (!personagem || personagem.userId !== auth.user.id) {
      return NextResponse.json(
        { error: "Personagem inválido ou sem permissão." },
        { status: 403 },
      );
    }

    const mesa = await prisma.mesa.findUnique({ where: { codigoAcesso: codigo } });
    if (!mesa) {
      return NextResponse.json({ error: "Código de mesa inválido." }, { status: 404 });
    }

    await prisma.personagem.update({
      where: { id: personagemId },
      data: { mesaId: mesa.id },
    });

    return NextResponse.json({ message: "Entrou na mesa com sucesso.", mesa });
  } catch (e) {
    return handlePrismaError(e);
  }
}
