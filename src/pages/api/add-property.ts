import type { APIRoute } from 'astro';
import { supabase } from "../../lib/supabaseClient";
import { mapPropertyToDb } from "../../services/propertyMapper";
import type { Property } from "../../types/property";
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import { Readable } from 'stream';

// הגדרות multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // מקסימום 10 קבצים
    fieldSize: 10 * 1024 * 1024, // 10MB total
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    // בדיקת MIME type
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`));
    }
  }
});


export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const MAX_PROCESSING_TIME = 30000; // 30 שניות

  try {
    console.log("API: Starting add-property request");

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

    // קריאת נתונים מהטופס
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
    console.log("User role:", user.role);
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, message: "Access denied, admin role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
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
      checkInTime: (formData.get("checkInTime") as string) || undefined,
      checkOutTime: (formData.get("checkOutTime") as string) || undefined,
      minStayDays: Number(formData.get("minStayDays")) || 0,
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
    const MAX_FILES = 10; // מקסימום 10 תמונות
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    // בדיקת מספר קבצים
    if (images.length > MAX_FILES) {
      return new Response(JSON.stringify({
        success: false,
        message: `Too many files. Maximum ${MAX_FILES} files allowed.`,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // בדיקת גודל כולל של כל הקבצים
    const totalSize = images.reduce((sum, file) => sum + file.size, 0);
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

    for (const file of images) {
      if (!file) continue;

      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

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

      // בדיקת MIME type - יותר גמישה
      const fileBuffer = await file.arrayBuffer();
      const fileType = await fileTypeFromBuffer(fileBuffer);

      // אם fileType לא זמין, נבדוק לפי הרחבה
      if (!fileType) {
        console.log(`File type detection failed for ${file.name}, checking by extension`);
        if (fileExtension.endsWith('.jpg') || fileExtension.endsWith('.jpeg')) {
          // נמשיך עם הקובץ
        } else if (fileExtension.endsWith('.png')) {
          // נמשיך עם הקובץ
        } else if (fileExtension.endsWith('.gif')) {
          // נמשיך עם הקובץ
        } else if (fileExtension.endsWith('.webp')) {
          // נמשיך עם הקובץ
        } else {
          return new Response(JSON.stringify({
            success: false,
            message: `Cannot determine file type for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else if (fileType && !allowedMimeTypes.includes(fileType.mime)) {
        console.log(`File type ${fileType.mime} not allowed, but extension ${fileExtension} is valid`);
        // אם הרחבה תקינה אבל MIME type לא, נמשיך בכל מקרה
        if (!hasValidExtension) {
          return new Response(JSON.stringify({
            success: false,
            message: `Invalid file type for ${file.name}. Only image files are allowed.`,
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // בדיקת חתימה דיגיטלית של הקובץ
      const fileSignature = fileBuffer.slice(0, 4);
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

      const uploadFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileType?.ext || fileExtension.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from("properties")
        .upload(uploadFileName, fileBuffer, { contentType: file.type });

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

      const { data } = await supabase.storage.from("properties").getPublicUrl(uploadFileName);
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
