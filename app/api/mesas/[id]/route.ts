import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, requireUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

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
      return NextResponse.json({ error: "Apenas o narrador pode ver a mesa." }, { status: 403 });
    }
    return NextResponse.json(mesa);
  } catch (e) {
    return handlePrismaError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const mesa = await prisma.mesa.findUnique({ where: { id } });
    if (!mesa) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
    if (mesa.userId !== auth.user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    await prisma.mesa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e);
  }
}
