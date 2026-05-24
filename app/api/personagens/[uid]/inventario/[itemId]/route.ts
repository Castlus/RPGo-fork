import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handlePrismaError,
  pickAllowed,
  readJson,
  requirePersonagemAccess,
  requireUser,
} from "@/lib/api-utils";

type Params = { params: Promise<{ uid: string; itemId: string }> };

const ALLOWED_FIELDS = [
  "nome",
  "peso",
  "tipo",
  "tags",
  "descricao",
  "dano",
  "modificador",
  "ca",
  "penalidadeDes",
  "equipado",
  "favorito",
] as const;

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid, itemId } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  const body = await readJson<Record<string, unknown>>(request);
  const data = pickAllowed<Record<string, unknown>>(body, ALLOWED_FIELDS);

  try {
    // personagemId no where garante defesa em profundidade (item pertence ao personagem certo).
    const item = await prisma.item.update({
      where: { id: itemId, personagemId: uid },
      data,
    });
    return NextResponse.json(item);
  } catch (e) {
    return handlePrismaError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid, itemId } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  try {
    await prisma.item.delete({
      where: { id: itemId, personagemId: uid },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e);
  }
}
