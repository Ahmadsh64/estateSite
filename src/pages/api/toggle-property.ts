import { supabase } from "../../lib/supabaseClient";

interface TogglePropertyBody {
  id: string;
  activate: boolean;
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // --- Authorization ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // בדיקה מול Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), { status: 403 });
    }

    // בדיקת role אדמין
    const { data: roleData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), { status: 403 });
    }

    // --- קריאת body ---
    const body: TogglePropertyBody = await request.json();
    const { id, activate } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), { status: 400 });
    }

    // --- עדכון סטטוס הדירה ---
    const { data, error } = await supabase
      .from("properties")
      .update({ is_active: activate })
      .eq("id", id);

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Unknown server error" }),
      { status: 500 }
    );
  }
}
