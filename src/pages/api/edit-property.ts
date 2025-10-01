import { supabase } from "../../lib/supabaseClient";
import type { Property } from "../../types/property";
import { mapPropertyToDb } from "../../services/propertyMapper";
import { fileTypeFromBuffer } from 'file-type';

// Rate limiting - מניעת spam
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 דקה
const RATE_LIMIT_MAX_REQUESTS = 5; // מקסימום 5 בקשות בדקה

export async function POST({ request }: { request: Request }): Promise<Response> {
  const startTime = Date.now();
  const MAX_PROCESSING_TIME = 30000; // 30 שניות
  
  try {
    // בדיקת Rate Limiting
    const clientIP = request.headers.get("x-forwarded-for") || "unknown";
    const currentTime = Date.now();
    const clientData = rateLimitMap.get(clientIP);
    
    if (clientData) {
      if (currentTime - clientData.lastReset > RATE_LIMIT_WINDOW) {
        clientData.count = 0;
        clientData.lastReset = currentTime;
      }
      
      if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
        return new Response(JSON.stringify({
          success: false,
          message: "Too many requests. Please try again later.",
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      clientData.count++;
    } else {
      rateLimitMap.set(clientIP, { count: 1, lastReset: currentTime });
    }
    
    // בדיקת גודל בקשה
    const contentLength = request.headers.get("content-length");
    const MAX_REQUEST_SIZE = 100 * 1024 * 1024; // 100MB
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        message: "Request too large. Maximum 100MB allowed.",
      }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }
    
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
    if (user.role !== "admin") {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), { status: 403 });
    }

    // בדיקת זמן החיים של הטוקן
    const tokenExp = (user as any).exp;
    const currentUnixTime = Math.floor(Date.now() / 1000);
    if (tokenExp && tokenExp < currentUnixTime) {
      return new Response(JSON.stringify({ success: false, message: "Token expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // בדיקת זמן החיים של הטוקן - מקסימום 24 שעות
    const MAX_TOKEN_AGE = 24 * 60 * 60; // 24 שעות
    if (tokenExp && (currentUnixTime - tokenExp) > MAX_TOKEN_AGE) {
      return new Response(JSON.stringify({ success: false, message: "Token too old" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
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

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 10; // מקסימום 10 תמונות
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    // בדיקת מספר קבצים
    if (newFiles.length > MAX_FILES) {
      return new Response(JSON.stringify({
        success: false,
        message: `Too many files. Maximum ${MAX_FILES} files allowed.`,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // בדיקת גודל כולל של כל הקבצים
    const totalSize = newFiles.reduce((sum, file) => sum + (file instanceof File ? file.size : 0), 0);
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
    if (totalSize > MAX_TOTAL_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        message: `Total file size too large. Maximum ${MAX_TOTAL_SIZE / (1024 * 1024)}MB allowed.`,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    for (const file of newFiles) {
      if (file instanceof File) {
        // בדיקת זמן עיבוד
        if (Date.now() - startTime > MAX_PROCESSING_TIME) {
          return new Response(JSON.stringify({
            success: false,
            message: "Processing timeout. Please try again with fewer files.",
          }), {
            status: 408,
            headers: { "Content-Type": "application/json" }
          });
        }
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

        // בדיקת שם הקובץ
        const fileExtension = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileExtension.endsWith(ext));
        
        if (!hasValidExtension) {
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid file extension for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // בדיקת MIME type אמיתית
        const arrayBuffer = await file.arrayBuffer();
        const fileType = await fileTypeFromBuffer(arrayBuffer);
        
        if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid file type for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // בדיקת חתימה דיגיטלית של הקובץ
        const fileSignature = arrayBuffer.slice(0, 4);
        const validSignatures = [
          new Uint8Array([0xFF, 0xD8, 0xFF]), // JPEG
          new Uint8Array([0x89, 0x50, 0x4E, 0x47]), // PNG
          new Uint8Array([0x47, 0x49, 0x46, 0x38]), // GIF
          new Uint8Array([0x52, 0x49, 0x46, 0x46]), // WEBP (RIFF)
        ];

        const isValidSignature = validSignatures.some(signature => {
          return signature.every((byte, index) => new Uint8Array(fileSignature)[index] === byte);
        });

        if (!isValidSignature) {
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid file signature for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // בדיקת MIME type מהמטאדאטה של הדפדפן (כבדיקה נוספת)
        if (!allowedMimeTypes.includes(file.type)) {
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid file type for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const uploadFileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileType.ext}`;
        const { error: uploadError } = await supabase.storage.from("properties").upload(uploadFileName, new Uint8Array(arrayBuffer), { contentType: file.type });
        if (!uploadError) {
          const { data } = await supabase.storage.from("properties").getPublicUrl(uploadFileName);
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
