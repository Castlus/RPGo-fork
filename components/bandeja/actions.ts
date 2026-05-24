"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Prisma } from "@prisma/client";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return user;
}

export type MensagemSerializada = {
  id: string;
  sessionId: string;
  uid: string;
  nome: string;
  mensagem: string | null;
  timestamp: string;
  tipo: string | null;
  total: number | null;
  modificador: number | null;
  detalhes: unknown;
};

function serializar(m: {
  id: string;
  sessionId: string;
  uid: string;
  nome: string;
  mensagem: string | null;
  timestamp: Date;
  tipo: string | null;
  total: number | null;
  modificador: number | null;
  detalhes: Prisma.JsonValue;
}): MensagemSerializada {
  return {
    id: m.id,
    sessionId: m.sessionId,
    uid: m.uid,
    nome: m.nome,
    mensagem: m.mensagem,
    timestamp: m.timestamp.toISOString(),
    tipo: m.tipo,
    total: m.total,
    modificador: m.modificador,
    detalhes: m.detalhes,
  };
}

export async function listarMensagens(sessionId: string): Promise<MensagemSerializada[]> {
  await requireUser();
  const lista = await prisma.mensagem.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
    take: 200,
  });
  return lista.map(serializar);
}

export async function enviarMensagemTexto(
  sessionId: string,
  nome: string,
  mensagem: string,
): Promise<void> {
  const user = await requireUser();
  const texto = mensagem.trim();
  if (!texto) throw new Error("Mensagem vazia.");
  await prisma.mensagem.create({
    data: {
      sessionId,
      uid: user.id,
      nome: nome || "Anônimo",
      mensagem: texto,
      tipo: "texto",
    },
  });
}

type RolagemPayload = {
  total: number;
  detalhes: unknown;
  modificador: number;
  nomePreset?: string | null;
};

export async function enviarRolagem(
  sessionId: string,
  nome: string,
  rolagem: RolagemPayload,
): Promise<void> {
  const user = await requireUser();
  await prisma.mensagem.create({
    data: {
      sessionId,
      uid: user.id,
      nome: nome || "Anônimo",
      tipo: "rolagem",
      total: rolagem.total,
      modificador: rolagem.modificador,
      detalhes: {
        rolls: rolagem.detalhes,
        nomePreset: rolagem.nomePreset || null,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function limparMensagens(sessionId: string): Promise<void> {
  await requireUser();
  await prisma.mensagem.deleteMany({ where: { sessionId } });
}
