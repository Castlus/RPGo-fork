// Helper para o middleware do Next: refresca o token Supabase em cada navegação
// e propaga cookies atualizados pra request e response.
//
// IMPORTANTE: NÃO logar nada entre `createServerClient` e `supabase.auth.getUser()`
// — qualquer await/log no meio pode causar logouts aleatórios (race em refresh tokens).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Dispara refresh + escreve cookies via setAll.
  await supabase.auth.getUser();

  return supabaseResponse;
}
