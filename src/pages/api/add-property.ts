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
      washingmachine: formData.get("washingmachine") === "on",
      wifi: formData.get("wifi") === "on",
      tv: formData.get("tv") === "on",
      publictransportnearby: formData.get("publictransportnearby") === "on",
      parking: formData.get("parking") === "on",
      checkintime: (formData.get("checkintime") as string) || undefined,
      checkouttime: (formData.get("checkouttime") as string) || undefined,
      minstaydays: Number(formData.get("minstaydays")) || 0,
      images: [],
      is_active: true,
      created_at: new Date().toISOString(),
      has_pool: formData.get("has_pool") === "on", // בריכה
      has_private_pool: formData.get("has_private_pool") === "on", // בריכה פרטית
      has_jacuzzi: formData.get("has_jacuzzi") === "on", // ג'קוזי
      has_grill: formData.get("has_grill") === "on", // מנגל
      suitable_for: formData.getAll("suitable_for[]") as string[], // מתאים ל
      nearby: formData.getAll("nearby[]") as string[], // בקרבת המקום
      rating: Number(formData.get("rating")) || 0, // דירוג
      reviews_count: Number(formData.get("reviews_count")) || 0, // חוות דעת
      phone: formData.get("phone") as string, // טלפון
      whatsapp: formData.get("whatsapp") as string, // WhatsApp
    };

    // --- העלאת תמונות ---
    const images = formData.getAll("images") as File[];
    const imageUrls: string[] = [];

    for (const file of images) {
      if (file && file.name) {
        const ext = file.name.split(".").pop(); // הוצאת סיומת הקובץ
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        try {
          // העלאת התמונה לסטורג' ב-Supabase
          const { error: uploadError } = await supabase.storage
            .from("properties") // שם הבקט
            .upload(fileName, bytes, { contentType: file.type });

          if (uploadError) {
            throw new Error(`Image upload failed: ${uploadError.message}`);
          }

          // קבלת כתובת ה-URL הציבורית של התמונה
          const { data } = await supabase.storage.from("properties").getPublicUrl(fileName);

          // אם לא הצלחנו לקבל את ה-URL, נזרוק שגיאה
          if (!data?.publicUrl) {
            throw new Error("Error fetching public URL: URL is empty");
          }

          imageUrls.push(data.publicUrl);
        } catch (error: unknown) {
          if (error instanceof Error) {
            return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
          } else {
            return new Response(JSON.stringify({ success: false, message: "Unknown error" }), { status: 500 });
          }
        }
      }
    }

    // עדכון התמונות של הנכס עם כתובת ה-URL
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
