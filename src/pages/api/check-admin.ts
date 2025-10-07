import type { APIRoute } from 'astro';
import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // --- Authorization ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ isAdmin: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // בדיקה מול Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ isAdmin: false, message: "Invalid or expired session" }), { status: 403 });
    }

    // בדיקת role אדמין
    const isAdmin = user.role === "admin";

    return new Response(JSON.stringify({ isAdmin, role: user.role }), { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return new Response(
      JSON.stringify({ isAdmin: false, message: err instanceof Error ? err.message : "Unknown server error" }),
      { status: 500 }
    );
  }
}

