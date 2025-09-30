import type { APIRoute } from 'astro';
import { supabase } from "../../lib/supabaseClient";
import { mapPropertyToDb } from "../../services/propertyMapper";
import type { Property } from "../../types/property";
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("API: Starting add-property request");
    const formData = await request.formData();
    console.log("API: Form data received");
    
    // בדיקת הרשאות
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // בדיקת role
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // קבלת נתוני הטופס
    console.log("API: Creating property object");
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
      checkintime: (formData.get("checkInTime") as string) || undefined,
      checkouttime: (formData.get("checkOutTime") as string) || undefined,
      minstaydays: Number(formData.get("minstaydays")) || 0,
      images: [],
      is_active: true,
      created_at: new Date().toISOString(),
      has_pool: formData.get("has_pool") === "on",
      has_private_pool: formData.get("has_private_pool") === "on",
      has_jacuzzi: formData.get("has_jacuzzi") === "on",
      has_grill: formData.get("has_grill") === "on",
      suitable_for: (() => {
        try {
          return JSON.parse((formData.get("suitable_for") as string) || "[]");
        } catch (e) {
          console.error("Error parsing suitable_for:", e);
          return [];
        }
      })(),
      nearby: (() => {
        try {
          return JSON.parse((formData.get("nearby") as string) || "[]");
        } catch (e) {
          console.error("Error parsing nearby:", e);
          return [];
        }
      })(),
      rating: 0,
      reviews_count: 0,
      phone: (formData.get("phone") as string) || "",
      whatsapp: (formData.get("whatsapp") as string) || "",
    };

    // העלאת תמונות
    console.log("API: Starting image upload");
    const images = formData.getAll("images") as File[];
    const imageUrls: string[] = [];
    console.log(`API: Found ${images.length} images to upload`);

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
          headers: { "Content-Type": "application/json" }
        });
      }

      // בדיקת MIME type
      if (!allowedMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({
          success: false,
          message: `Invalid file type for ${file.name}. Only images are allowed.`,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${file.type.split('/')[1]}`;
      const fileBuffer = await file.arrayBuffer();
      
      const { error: uploadError } = await supabase.storage
        .from("properties")
        .upload(fileName, fileBuffer, { contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(JSON.stringify({
          success: false,
          message: uploadError.message,
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { data } = await supabase.storage.from("properties").getPublicUrl(fileName);
      if (!data?.publicUrl) {
        return new Response(JSON.stringify({
          success: false,
          message: "Error fetching public URL",
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      imageUrls.push(data.publicUrl);
    }

    property.images = imageUrls;
    console.log(`API: Uploaded ${imageUrls.length} images`);

    // שמירה ב-database
    console.log("API: Mapping property to database format");
    const dbRow = mapPropertyToDb(property);
    console.log("API: Inserting property to database");
    const { error: insertError } = await supabase.from("properties").insert([dbRow]);
    if (insertError) {
      console.error("Insert Error:", insertError);
      return new Response(JSON.stringify({
        success: false,
        message: `Database insert failed: ${insertError.message}`,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Property added successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Server error:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
    return new Response(JSON.stringify({ 
      success: false, 
      message: err instanceof Error ? err.message : "Server error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
