import { supabase } from "../../lib/supabaseClient";

interface TogglePropertyBody {
  id: string;
  activate: boolean;
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const body: TogglePropertyBody = await request.json();

    const id = body.id;
    const activate = body.activate;

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), { status: 400 });
    }

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
    if (err instanceof Error) {
      return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: false, message: "Unknown server error" }), { status: 500 });
  }
}
