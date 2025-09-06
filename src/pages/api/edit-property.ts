import { supabase } from "../../lib/supabaseClient";

interface Property {
  title: string;
  price: number;
  city: string;
  street: string;
  number: string;
  floor: string;
  description: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  type: string;
  kitchen: boolean;
  washingmachine: boolean;
  wifi: boolean;
  tv: boolean;
  publictransportnearby: boolean;
  parking: boolean;
  checkintime: string;
  checkouttime: string;
  minstaydays: number;
  images: string[];
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // בדיקת הרשאה
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ success: false, message: "Missing token" }), { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get("id")?.toString();

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), { status: 400 });
    }

    const title = formData.get("title")?.toString() || "";
    const price = parseFloat(formData.get("price")?.toString() || "0");

    // הגדרת המיקום בצורה נפרדת
    const city = formData.get("city")?.toString() || "";
    const street = formData.get("street")?.toString() || "";
    const number = formData.get("number")?.toString() || "";
    const floor = formData.get("floor")?.toString() || "";

    const description = formData.get("description")?.toString() || "";
    const bedrooms = parseInt(formData.get("bedrooms")?.toString() || "0");
    const beds = parseInt(formData.get("beds")?.toString() || "0");
    const bathrooms = parseInt(formData.get("bathrooms")?.toString() || "0");
    const type = formData.get("type")?.toString() || "";

    const kitchen = formData.get("kitchen") === "on";
    const washingmachine = formData.get("washingmachine") === "on";
    const wifi = formData.get("wifi") === "on";
    const tv = formData.get("tv") === "on";
    const publictransportnearby = formData.get("publictransportnearby") === "on";
    const parking = formData.get("parking") === "on";

    const checkintime = formData.get("checkintime")?.toString() || "";
    const checkouttime = formData.get("checkouttime")?.toString() || "";
    const minstaydays = parseInt(formData.get("minstaydays")?.toString() || "0");

    // תמונות קיימות
    const existingImages = formData.getAll("existingImages").map(i => i.toString());

    // תמונות חדשות
    const newFiles = formData.getAll("images");
    const newImages: string[] = [];

    for (const file of newFiles) {
      if (file instanceof File) {
        const fileExt = file.name.split(".").pop();
        const fileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("properties")
          .upload(fileName, file);

        if (uploadError) {
          console.error("שגיאה בהעלאת תמונה:", uploadError.message);
        } else {
          const { data } = supabase.storage.from("properties").getPublicUrl(fileName);
          if (data) {
            newImages.push(data.publicUrl); // עדכון כאן, מאחר שהתשובה מכילה data עם publicUrl
          }
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
        city,
        street,
        number,
        floor,
        description,
        bedrooms,
        beds,
        bathrooms,
        type,
        kitchen,
        washingmachine,
        wifi,
        tv,
        publictransportnearby,
        parking,
        checkintime,
        checkouttime,
        minstaydays,
        images: finalImages, // עדכון התמונות
      })
      .eq("id", id);

    if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });

    return new Response(JSON.stringify({ success: true, images: finalImages }), { status: 200 });
  } catch (err: unknown) {
    // טיפול בשגיאה כאשר err הוא type 'unknown'
    console.error(err);
    if (err instanceof Error) {
      return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: false, message: "Unknown server error" }), { status: 500 });
  }
}
