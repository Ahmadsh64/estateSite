import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.role !== "admin") {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), { status: 403 });
    }

    const body = await request.json();
    const id = body.id?.toString();
    const activate = !!body.activate;

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("properties")
      .update({ is_active: activate })
      .eq("id", id);

    if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}
