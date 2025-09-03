import { supabase } from "../../lib/supabaseClient";

export async function POST({ request }) {
  try {
    // בדיקת הרשאה
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ success: false, message: "Missing token" }), { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get("id")?.toString();
    const title = formData.get("title")?.toString() || "";
    const price = parseFloat(formData.get("price")?.toString() || "0");

    // מיקום
    const location = {
      city: formData.get("city")?.toString() || "",
      street: formData.get("street")?.toString() || "",
      number: formData.get("number")?.toString() || "",
      floor: formData.get("floor")?.toString() || null,
    };

    const description = formData.get("description")?.toString() || "";
    const bedrooms = parseInt(formData.get("bedrooms")?.toString() || "0");
    const beds = parseInt(formData.get("beds")?.toString() || "0");
    const bathrooms = parseInt(formData.get("bathrooms")?.toString() || "0");
    const type = formData.get("type")?.toString() || "";

    const kitchen = formData.get("kitchen") === "on";
    const washingMachine = formData.get("washingMachine") === "on";
    const wifi = formData.get("wifi") === "on";
    const tv = formData.get("tv") === "on";
    const publicTransportNearby = formData.get("publicTransportNearby") === "on";
    const parking = formData.get("parking") === "on";

    const checkInTime = formData.get("checkInTime")?.toString() || "";
    const checkOutTime = formData.get("checkOutTime")?.toString() || "";
    const minStayDays = parseInt(formData.get("minStayDays")?.toString() || "0");

    // תמונות קיימות
    const existingImages = formData.getAll("existingImages").map(i => i.toString());

    // תמונות חדשות
    const newFiles = formData.getAll("images");
    const newImages = [];

    for (const file of newFiles) {
      if (file instanceof File) {
        const fileExt = file.name.split(".").pop();
        const fileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("properties")
          .upload(fileName, file);

        if (uploadError) console.error("שגיאה בהעלאת תמונה:", uploadError.message);
        else {
          const { publicUrl } = supabase.storage.from("properties").getPublicUrl(fileName);
          newImages.push(publicUrl);
        }
      }
    }

    const finalImages = [...existingImages, ...newImages];

    // עדכון הדירה ב-Supabase
    const { error } = await supabase
      .from("properties")
      .update({
        title,
        price,
        location,
        description,
        bedrooms,
        beds,
        bathrooms,
        type,
        kitchen,
        washingMachine,
        wifi,
        tv,
        publicTransportNearby,
        parking,
        checkInTime,
        checkOutTime,
        minStayDays,
        images: finalImages,
      })
      .eq("id", id);

    if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });

    return new Response(JSON.stringify({ success: true, images: finalImages }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}
