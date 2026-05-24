import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handlePrismaError,
  requirePersonagemAccess,
  requireUser,
} from "@/lib/api-utils";

type Params = { params: Promise<{ uid: string; acaoId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid, acaoId } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  try {
    await prisma.acao.delete({
      where: { id: acaoId, personagemId: uid },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e);
  }
}
