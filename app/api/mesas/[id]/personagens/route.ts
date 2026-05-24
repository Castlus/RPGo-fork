import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, requireUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/mesas/[id]/personagens — só o narrador da mesa pode listar.
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const mesa = await prisma.mesa.findUnique({
      where: { id },
      include: { personagens: true },
    });
    if (!mesa) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
    if (mesa.userId !== auth.user.id) {
      return NextResponse.json({ error: "Apenas o narrador." }, { status: 403 });
    }
    return NextResponse.json(mesa.personagens);
  } catch (e) {
    return handlePrismaError(e);
  }
}
