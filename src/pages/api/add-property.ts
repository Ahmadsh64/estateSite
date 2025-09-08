import { supabase } from "../../lib/supabaseClient";
import { mapPropertyToDb } from "../../services/propertyMapper";
import type { Property } from "../../types/property";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // --- אימות משתמש ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Missing token" }), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), { status: 403 });
    }

    // --- בדיקת role ---
    const { data: roleData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), { status: 403 });
    }

    // --- קבלת נתוני הטופס ---
    const formData = await request.formData();

    const property: Property = {
      id: crypto.randomUUID(),
      title: formData.get("title") as string,
      price: Number(formData.get("price")),
      location: {
        city: formData.get("city") as string,
        street: (formData.get("street") as string) || "",
        number: (formData.get("number") as string) || "",
        floor: (formData.get("floor") as string) || "",
      },
      occupancy: Number(formData.get("occupancy")) || 0,
      bedrooms: Number(formData.get("bedrooms")) || 0,
      beds: Number(formData.get("beds")) || 0,
      bathrooms: Number(formData.get("bathrooms")) || 0,
      type: (formData.get("type") as string) || "",
      description: (formData.get("description") as string) || "",
      kitchen: formData.get("kitchen") === "on",
      washingMachine: formData.get("washingMachine") === "on",
      wifi: formData.get("wifi") === "on",
      tv: formData.get("tv") === "on",
      publicTransportNearby: formData.get("publicTransportNearby") === "on",
      parking: formData.get("parking") === "on",
      checkInTime: (formData.get("checkInTime") as string) || undefined,
      checkOutTime: (formData.get("checkOutTime") as string) || undefined,
      minStayDays: Number(formData.get("minStayDays")) || 0,
      images: [],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // --- העלאת תמונות ---
    const images = formData.getAll("images") as File[];
    const imageUrls: string[] = [];

    for (const file of images) {
      if (file && file.name) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from("properties")
          .upload(fileName, bytes, { contentType: file.type });

        if (uploadError) {
          return new Response(JSON.stringify({ success: false, message: `Image upload failed: ${uploadError.message}` }), { status: 500 });
        }

        const { data } = supabase.storage.from("properties").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }
    }

    property.images = imageUrls;

    // --- שמירה בטבלה ---
    const dbRow = mapPropertyToDb(property);
    const { error: insertError } = await supabase.from("properties").insert([dbRow]);

    if (insertError) {
      return new Response(JSON.stringify({ success: false, message: `Database insert failed: ${insertError.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: "Property added successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), { status: 500 });
  }
}
