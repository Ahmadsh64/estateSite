import { supabase } from "../../lib/supabaseClient";
import type { Property } from "../../types/property";
import { mapPropertyToDb } from "../../services/propertyMapper";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    // --- Authorization ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // בדיקה מול Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired session" }), { status: 403 });
    }

    // בדיקת role
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
    const id = formData.get("id")?.toString();
    if (!id) return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), { status: 400 });

    const property: Partial<Property> = {
      title: formData.get("title")?.toString() || "",
      price: parseFloat(formData.get("price")?.toString() || "0"),
      location: {
        city: formData.get("city")?.toString() || "",
        street: formData.get("street")?.toString() || "",
        number: formData.get("number")?.toString() || "",
        floor: formData.get("floor")?.toString() || "",
      },
      occupancy: parseInt(formData.get("occupancy")?.toString() || "0"),
      bedrooms: parseInt(formData.get("bedrooms")?.toString() || "0"),
      beds: parseInt(formData.get("beds")?.toString() || "0"),
      bathrooms: parseInt(formData.get("bathrooms")?.toString() || "0"),
      type: formData.get("type")?.toString() || "",
      description: formData.get("description")?.toString() || "",
      kitchen: formData.get("kitchen") === "on",
      washingMachine: formData.get("washingMachine") === "on",
      wifi: formData.get("wifi") === "on",
      tv: formData.get("tv") === "on",
      publicTransportNearby: formData.get("publicTransportNearby") === "on",
      parking: formData.get("parking") === "on",
      checkInTime: formData.get("checkInTime")?.toString() || "",
      checkOutTime: formData.get("checkOutTime")?.toString() || "",
      minStayDays: parseInt(formData.get("minStayDays")?.toString() || "0"),
      is_active: formData.get("is_active") !== "false", // אפשרות לשינוי סטטוס
    };

    // --- תמונות ---
    const existingImages = formData.getAll("existingImages").map(i => i.toString());
    const newFiles = formData.getAll("images");
    const newImages: string[] = [];

    for (const file of newFiles) {
      if (file instanceof File) {
        const ext = file.name.split(".").pop();
        const fileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage.from("properties").upload(fileName, new Uint8Array(arrayBuffer), { contentType: file.type });
        if (!uploadError) {
          const { data } = await supabase.storage.from("properties").getPublicUrl(fileName);
          if (data?.publicUrl) newImages.push(data.publicUrl);
        } else {
          console.error("Upload failed:", uploadError.message);
        }
      }
    }

    const finalImages = [...existingImages, ...newImages];

    // --- עדכון הדירה ---
    const dbRow = mapPropertyToDb({ ...property, images: finalImages, id } as Property);
    const { error } = await supabase.from("properties").update(dbRow).eq("id", id);

    if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });

    return new Response(JSON.stringify({ success: true, images: finalImages }), { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Unknown server error" }),
      { status: 500 }
    );
  }
}
