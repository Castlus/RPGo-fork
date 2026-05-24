// Instância única do PrismaClient compartilhada por todas as rotas.
// Evita múltiplos pools de conexão (importante por causa do limite do PgBouncer/Supabase).
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
