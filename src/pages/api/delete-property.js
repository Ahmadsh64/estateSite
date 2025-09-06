import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    // --- בדיקת Authorization Header ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing token" }),
        { status: 401 }
      );
    }

    // --- בדיקת משתמש – רק admin יכול למחוק ---
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid or expired session" }),
        { status: 403 }
      );
    }

    // --- קריאת ID של הדירה ---
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing property ID" }),
        { status: 400 }
      );
    }

    // --- בדיקת אם ה-ID הוא מספר ---
    if (isNaN(Number(id))) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid property ID" }),
        { status: 400 }
      );
    }

    // --- עדכון השדה is_active ל- false ---
    const { data, error } = await supabase
      .from("properties")
      .update({ is_active: false })
      .eq("id", id)
      .select(); // להחזיר את הנתונים המעודכנים

    if (error) {
      console.error("Error during update:", error.message);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400 }
      );
    }

    // --- החזרת נתונים מעודכנים לאחר השינוי ---
    return new Response(
      JSON.stringify({ success: true, message: "Property deactivated", data }),
      { status: 200 }
    );

  } catch (err) {
    console.error("Server error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error", error: err.message }),
      { status: 500 }
    );
  }
}
