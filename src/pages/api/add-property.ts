import { supabase } from "../../lib/supabaseClient";
import { mapPropertyToDb } from "../../services/propertyMapper";
import type { Property } from "../../types/property";
import express, { Request, Response } from 'express';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage }).array('images'); // "images" הוא שם השדה בטופס

const app = express();

// הגדרת פונקציית POST שתשמש ב-multer
app.post('/api/add-property', (req: Request, res: Response) => {
  // טיפול בבקשה באמצעות multer
  upload(req, res, async (err: any) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: `Error uploading files: ${err.message}`
      });
    }

    const formData = req.body;  // גישה לנתוני הטופס אחרי עיבוד multer

    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ success: false, message: "Missing token" });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return res.status(403).json({ success: false, message: "Invalid or expired session" });
      }

      // --- בדיקת role ---
      const { data: roleData, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError || roleData?.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied, admin role required" });
      }

      // --- קבלת נתוני הטופס ---
      const property: Property = {
        id: crypto.randomUUID(),
        title: formData.title,
        price: Number(formData.price),
        location: {
          city: formData.city,
          street: formData.street || "",
          number: formData.number || "",
          floor: formData.floor || "",
        },
        occupancy: Number(formData.occupancy) || 0,
        bedrooms: Number(formData.bedrooms) || 0,
        beds: Number(formData.beds) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        type: formData.type || "",
        description: formData.description || "",
        kitchen: formData.kitchen === "on",
        washingmachine: formData.washingmachine === "on",
        wifi: formData.wifi === "on",
        tv: formData.tv === "on",
        publictransportnearby: formData.publictransportnearby === "on",
        parking: formData.parking === "on",
        checkintime: formData.checkintime || undefined,
        checkouttime: formData.checkouttime || undefined,
        minstaydays: Number(formData.minstaydays) || 0,
        images: [],
        is_active: true,
        created_at: new Date().toISOString(),
        has_pool: formData.has_pool === "on",
        has_private_pool: formData.has_private_pool === "on",
        has_jacuzzi: formData.has_jacuzzi === "on",
        has_grill: formData.has_grill === "on",
        suitable_for: formData.suitable_for || [],
        nearby: formData.nearby || [],
        rating: Number(formData.rating) || 0,
        reviews_count: Number(formData.reviews_count) || 0,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
      };

      // --- העלאת תמונות ---
      const images = req.files as Express.Multer.File[];
      const imageUrls: string[] = [];

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

      for (const file of images) {
        if (!file) continue;

        // בדיקת גודל
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} exceeds 5MB limit`,
          });
        }

        // בדיקת MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `Invalid file type for ${file.originalname}. Only images are allowed.`,
          });
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${file.mimetype.split('/')[1]}`;
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          return res.status(500).json({
            success: false,
            message: uploadError.message,
          });
        }

        const { data } = await supabase.storage.from("property-images").getPublicUrl(fileName);
        if (!data?.publicUrl) {
          return res.status(500).json({
            success: false,
            message: "Error fetching public URL",
          });
        }

        imageUrls.push(data.publicUrl);
      }

      property.images = imageUrls;

      // -- שמירה ב-database --
      const dbRow = mapPropertyToDb(property);
      const { error: insertError } = await supabase.from("properties").insert([dbRow]);
      if (insertError) {
        console.error("Insert Error:", insertError);
        return res.status(500).json({
          success: false,
          message: `Database insert failed: ${insertError.message}`,
        });
      }

      res.status(200).json({ success: true, message: "Property added successfully" });

    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });
});

export default app;
