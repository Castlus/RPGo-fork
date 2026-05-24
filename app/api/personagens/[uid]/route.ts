import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handlePrismaError,
  pickAllowed,
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

  return NextResponse.json(acesso.personagem);
}

const ALLOWED_FIELDS = [
  "nome",
  "nivel",
  "hpAtual",
  "hpMax",
  "ppAtual",
  "ppMax",
  "cargaMaxima",
  "ultimaRolagem",
  "fotoUrl",
  "forca",
  "destreza",
  "constituicao",
  "sabedoria",
  "vontade",
  "presenca",
  "mesaId",
] as const;

type PatchBody = Partial<Record<(typeof ALLOWED_FIELDS)[number], unknown>> & {
  atributos?: {
    forca?: number;
    destreza?: number;
    constituicao?: number;
    sabedoria?: number;
    vontade?: number;
    presenca?: number;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  const body = await readJson<PatchBody>(request);
  const data = pickAllowed<Record<string, unknown>>(
    body as Record<string, unknown> | null,
    ALLOWED_FIELDS,
  );
  // Atributos podem vir aninhados — espalha no nível raiz pra bater com o schema.
  if (body?.atributos) Object.assign(data, body.atributos);

  try {
    const personagem = await prisma.personagem.update({
      where: { id: uid },
      data,
    });
    return NextResponse.json(personagem);
  } catch (e) {
    return handlePrismaError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { uid } = await params;
  const acesso = await requirePersonagemAccess(uid, auth.user.id);
  if ("error" in acesso) return acesso.error;

  try {
    await prisma.personagem.delete({ where: { id: uid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e);
  }
}
