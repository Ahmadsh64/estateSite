import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    const formData = await request.formData();

    const id = formData.get("id");
    const title = formData.get("title");
    const price = formData.get("price");
    const location = formData.get("location");
    const description = formData.get("description");

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // קבלת התמונות הקיימות (שלא הוסרו)
    const existingImages = formData.getAll("existingImages");

    // קבלת התמונות החדשות להעלאה
    const imageFiles = formData.getAll("images");

    const newImages = [];

    for (const file of imageFiles) {
      if (file && file.name) {
        const ext = file.name.split(".").pop();
        const newFileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

        // העלאה ל-Supabase storage
        const { error: uploadError } = await supabase.storage
          .from("properties") // 👈 השם של ה-bucket שלך ב-Supabase
          .upload(newFileName, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // קבלת URL ציבורי
        const { data: publicUrlData } = supabase.storage
          .from("properties")
          .getPublicUrl(newFileName);

        if (publicUrlData?.publicUrl) {
          newImages.push(publicUrlData.publicUrl);
        }
      }
    }

    // התמונות הסופיות: קיימות + חדשות
    const finalImages = [...existingImages, ...newImages];

    // עדכון הרשומה ב-Supabase
    const { error: updateError } = await supabase
      .from("properties")
      .update({
        title,
        price: Number(price),
        location,
        description,
        images: finalImages,
      })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      return new Response(JSON.stringify({ success: false, message: "DB update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, images: finalImages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
