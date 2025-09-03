import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    const formData = await request.formData();

    const title = formData.get("title")?.toString() || "";
    const price = parseFloat(formData.get("price")?.toString() || "0");
    const location = formData.get("location")?.toString() || "";
    const description = formData.get("description")?.toString() || "";

    const imageFiles = formData.getAll("images");
    const images = [];

    // שמירת תמונות ב-Supabase Storage (תיקייה בשם "properties")
    for (const file of imageFiles) {
      if (file instanceof File) {
        const fileExt = file.name.split(".").pop();
        const fileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        
        // העלאה ל-Supabase Storage
        const { data, error } = await supabase.storage
          .from("properties")
          .upload(fileName, file);

        if (error) {
          console.error("שגיאה בהעלאת תמונה:", error.message);
        } else {
          const { publicUrl } = supabase.storage
            .from("properties")
            .getPublicUrl(fileName);
          images.push(publicUrl);
        }
      }
    }

    // הוספת הדירה ל-Supabase
    const { data, error } = await supabase
      .from("properties")
      .insert([{ title, price, location, description, images }]);

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}
