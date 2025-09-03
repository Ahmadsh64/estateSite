import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    // --- אימות משתמש ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing token" }),
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid or expired session" }),
        { status: 403 }
      );
    }

    // --- נתוני הטופס ---
    const formData = await request.formData();
    const property = {
      title: formData.get("title"),
      price: Number(formData.get("price")),
      city: formData.get("city"),
      street: formData.get("street") || "",
      number: formData.get("number") || "",
      floor: formData.get("floor") || "",
      bedrooms: Number(formData.get("bedrooms")) || 0,
      beds: Number(formData.get("beds")) || 0,
      bathrooms: Number(formData.get("bathrooms")) || 0,
      type: formData.get("type") || "",
      description: formData.get("description") || "",
      kitchen: formData.get("kitchen") === "on",
      washingmachine: formData.get("washingMachine") === "on",
      wifi: formData.get("wifi") === "on",
      tv: formData.get("tv") === "on",
      publictransportnearby: formData.get("publicTransportNearby") === "on",
      parking: formData.get("parking") === "on",
      checkintime: formData.get("checkInTime") || null,
      checkouttime: formData.get("checkOutTime") || null,
      minstaydays: Number(formData.get("minStayDays")) || 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // --- העלאת תמונות ל-Supabase Storage ---
    const images = formData.getAll("images");
    let imageUrls = [];

    for (const file of images) {
      if (file && file.name) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from("properties")
          .upload(fileName, buffer, { contentType: file.type });

        if (uploadError) {
          console.error("Upload failed:", uploadError.message);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Image upload failed: ${uploadError.message}. ודא שהרשאות ה-bucket פתוחות.`,
            }),
            { status: 500 }
          );
        }

        const { data } = supabase.storage.from("properties").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }
    }

    property.images = imageUrls;

    // --- שמירה בטבלה ---
    const { error: insertError } = await supabase.from("properties").insert([property]);

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, message: "Database insert failed" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Property added successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Server error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500 }
    );
  }
}
