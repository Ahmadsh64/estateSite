// pages/api/add-property.ts

import { supabase } from "../../lib/supabaseClient";
import { mapPropertyToDb } from "../../services/propertyMapper";
import type { Property } from "../../types/property";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // --- אימות משתמש ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- בדיקת role ---
    const { data: roleData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
      has_pool: formData.get("has_pool") === "on",
      has_private_pool: formData.get("has_private_pool") === "on",
      has_jacuzzi: formData.get("has_jacuzzi") === "on",
      has_grill: formData.get("has_grill") === "on",
      suitable_for: formData.getAll("suitable_for[]") as string[],
      nearby: formData.getAll("nearby[]") as string[],
      rating: Number(formData.get("rating")) || 0,
      reviews_count: Number(formData.get("reviews_count")) || 0,
      phone: formData.get("phone") as string,
      whatsapp: formData.get("whatsapp") as string,
    };

    // --- העלאת תמונות ---
    const images = formData.getAll("images") as File[];
    const imageUrls: string[] = [];

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    for (const file of images) {
      if (!file) continue;

      // בדיקת גודל
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({
          success: false,
          message: `File ${file.name} exceeds 5MB limit`,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // בדיקת MIME type
      if (!allowedMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({
          success: false,
          message: `Invalid file type for ${file.name}. Only images are allowed.`,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      try {
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, bytes, { contentType: file.type });

        if (uploadError) throw new Error(uploadError.message);

        const { data } = await supabase.storage.from("property-images").getPublicUrl(fileName);
        if (!data?.publicUrl) throw new Error("Error fetching public URL");

        imageUrls.push(data.publicUrl);
      } catch (error: unknown) {
        console.error("Upload error:", error);
        return new Response(JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    property.images = imageUrls;

    // -- שמירה ב-database --
    const dbRow = mapPropertyToDb(property);
    console.log("Inserting data into database:", dbRow);

    const { error: insertError } = await supabase.from("properties").insert([dbRow]);
    if (insertError) {
      console.error("Insert Error:", insertError);
      return new Response(JSON.stringify({
        success: false,
        message: `Database insert failed: ${insertError.message}`,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Property added successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
