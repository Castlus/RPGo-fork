// ─── Configuração do Supabase (client-side) ──────────────────────────────────
// Substitua os valores abaixo pelos encontrados em: Supabase → Settings → API
//
//   SUPABASE_URL   = Project URL
//   SUPABASE_ANON  = anon/public key  ← segura para o browser
//
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://wtjowcjuzrlpbvpmuyuv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0am93Y2p1enJscGJ2cG11eXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODI1NTIsImV4cCI6MjA4NzQ1ODU1Mn0.wHYb5NGIh6j1jw0ZSDFSKW_JL6RcACQtJjS8b_WH6f8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
