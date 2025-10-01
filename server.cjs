const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// הגדרות CORS
app.use(cors({
  origin: ['http://localhost:4324', 'http://localhost:4323', 'http://localhost:4322', 'http://localhost:4321'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// הגדרות Supabase
const supabase = createClient(
  'https://exnsylhgwjvpphistxqz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bnN5bGhnd2p2cHBoaXN0eHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE5OTYsImV4cCI6MjA3MTc5Nzk5Nn0.AsiFY7yVDlJqou7naHbqLMS75AqNJlE5JNpC3hmnsLc'
);

// הגדרות multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // מקסימום 10 קבצים
  },
  fileFilter: (req, file, cb) => {
    // בדיקת סוג קובץ
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// פונקציה למיפוי נכס לפורמט מסד נתונים
function mapPropertyToDb(property) {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    city: property.location.city,
    street: property.location.street,
    number: property.location.number,
    floor: property.location.floor,
    occupancy: property.occupancy,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: property.bathrooms,
    type: property.type,
    description: property.description,
    kitchen: property.kitchen,
    washingmachine: property.washingmachine,
    wifi: property.wifi,
    tv: property.tv,
    publictransportnearby: property.publictransportnearby,
    parking: property.parking,
    checkintime: property.checkintime,
    checkouttime: property.checkouttime,
    minstaydays: property.minstaydays,
    images: property.images,
    is_active: property.is_active,
    created_at: property.created_at,
    has_pool: property.has_pool,
    has_private_pool: property.has_private_pool,
    has_jacuzzi: property.has_jacuzzi,
    has_grill: property.has_grill,
    suitable_for: property.suitable_for,
    nearby: property.nearby,
    rating: property.rating,
    reviews_count: property.reviews_count,
    phone: property.phone,
    whatsapp: property.whatsapp
  };
}

// Route להוספת נכס
app.post('/api/add-property', upload.array('images', 10), async (req, res) => {
  try {
    console.log("Express: Starting add-property request");
    
    // בדיקת הרשאות
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(403).json({ success: false, message: "Invalid or expired session" });
    }

    // בדיקת role
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied, admin role required" });
    }

    // קבלת נתוני הטופס
    console.log("Express: Creating property object");
    const property = {
      id: crypto.randomUUID(),
      title: req.body.title,
      price: Number(req.body.price),
      location: {
        city: req.body.city,
        street: req.body.street || "",
        number: req.body.number || "",
        floor: req.body.floor || "",
      },
      occupancy: Number(req.body.occupancy) || 0,
      bedrooms: Number(req.body.bedrooms) || 0,
      beds: Number(req.body.beds) || 0,
      bathrooms: Number(req.body.bathrooms) || 0,
      type: req.body.type || "",
      description: req.body.description || "",
      kitchen: req.body.kitchen === "on",
      washingmachine: req.body.washingmachine === "on",
      wifi: req.body.wifi === "on",
      tv: req.body.tv === "on",
      publictransportnearby: req.body.publictransportnearby === "on",
      parking: req.body.parking === "on",
      checkintime: req.body.checkInTime || undefined,
      checkouttime: req.body.checkOutTime || undefined,
      minstaydays: Number(req.body.minstaydays) || 0,
      images: [],
      is_active: true,
      created_at: new Date().toISOString(),
      has_pool: req.body.has_pool === "on",
      has_private_pool: req.body.has_private_pool === "on",
      has_jacuzzi: req.body.has_jacuzzi === "on",
      has_grill: req.body.has_grill === "on",
      suitable_for: (() => {
        try {
          return JSON.parse(req.body.suitable_for || "[]");
        } catch (e) {
          console.error("Error parsing suitable_for:", e);
          return [];
        }
      })(),
      nearby: (() => {
        try {
          return JSON.parse(req.body.nearby || "[]");
        } catch (e) {
          console.error("Error parsing nearby:", e);
          return [];
        }
      })(),
      rating: 0,
      reviews_count: 0,
      phone: req.body.phone || "",
      whatsapp: req.body.whatsapp || "",
    };

    // העלאת תמונות
    console.log("Express: Starting image upload");
    const files = req.files || [];
    const imageUrls = [];
    console.log(`Express: Found ${files.length} images to upload`);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    for (const file of files) {
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
        .from("properties")
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: uploadError.message,
        });
      }

      const { data } = await supabase.storage.from("properties").getPublicUrl(fileName);
      if (!data?.publicUrl) {
        return res.status(500).json({
          success: false,
          message: "Error fetching public URL",
        });
      }

      imageUrls.push(data.publicUrl);
    }

    property.images = imageUrls;
    console.log(`Express: Uploaded ${imageUrls.length} images`);

    // שמירה ב-database
    console.log("Express: Mapping property to database format");
    const dbRow = mapPropertyToDb(property);
    console.log("Express: Inserting property to database");
    const { error: insertError } = await supabase.from("properties").insert([dbRow]);
    if (insertError) {
      console.error("Insert Error:", insertError);
      return res.status(500).json({
        success: false,
        message: `Database insert failed: ${insertError.message}`,
      });
    }

    res.json({ success: true, message: "Property added successfully", images: imageUrls });
  } catch (error) {
    console.error("Express Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Route לעריכת נכס
app.post('/api/edit-property', upload.array('images', 10), async (req, res) => {
  try {
    console.log("Express: Starting edit-property request");
    
    // בדיקת הרשאות
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(403).json({ success: false, message: "Invalid or expired session" });
    }

    // בדיקת role
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied, admin role required" });
    }

    const propertyId = req.body.id;
    if (!propertyId) {
      return res.status(400).json({ success: false, message: "Property ID is required" });
    }

    // קבלת נתוני הטופס
    console.log("Express: Creating property object for edit");
    const property = {
      id: propertyId,
      title: req.body.title,
      price: Number(req.body.price),
      location: {
        city: req.body.city,
        street: req.body.street || "",
        number: req.body.number || "",
        floor: req.body.floor || "",
      },
      occupancy: Number(req.body.occupancy) || 0,
      bedrooms: Number(req.body.bedrooms) || 0,
      beds: Number(req.body.beds) || 0,
      bathrooms: Number(req.body.bathrooms) || 0,
      type: req.body.type || "",
      description: req.body.description || "",
      kitchen: req.body.kitchen === "on",
      washingmachine: req.body.washingmachine === "on",
      wifi: req.body.wifi === "on",
      tv: req.body.tv === "on",
      publictransportnearby: req.body.publictransportnearby === "on",
      parking: req.body.parking === "on",
      checkintime: req.body.checkInTime || undefined,
      checkouttime: req.body.checkOutTime || undefined,
      minstaydays: Number(req.body.minstaydays) || 0,
      images: [],
      is_active: true,
      created_at: new Date().toISOString(),
      has_pool: req.body.has_pool === "on",
      has_private_pool: req.body.has_private_pool === "on",
      has_jacuzzi: req.body.has_jacuzzi === "on",
      has_grill: req.body.has_grill === "on",
      suitable_for: (() => {
        try {
          return JSON.parse(req.body.suitable_for || "[]");
        } catch (e) {
          console.error("Error parsing suitable_for:", e);
          return [];
        }
      })(),
      nearby: (() => {
        try {
          return JSON.parse(req.body.nearby || "[]");
        } catch (e) {
          console.error("Error parsing nearby:", e);
          return [];
        }
      })(),
      rating: 0,
      reviews_count: 0,
      phone: req.body.phone || "",
      whatsapp: req.body.whatsapp || "",
    };

    // העלאת תמונות חדשות
    console.log("Express: Starting image upload for edit");
    const files = req.files || [];
    const imageUrls = [];
    console.log(`Express: Found ${files.length} new images to upload`);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    for (const file of files) {
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
        .from("properties")
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: uploadError.message,
        });
      }

      const { data } = await supabase.storage.from("properties").getPublicUrl(fileName);
      if (!data?.publicUrl) {
        return res.status(500).json({
          success: false,
          message: "Error fetching public URL",
        });
      }

      imageUrls.push(data.publicUrl);
    }

    // הוספת תמונות קיימות
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    property.images = [...existingImages, ...imageUrls];
    console.log(`Express: Total images after edit: ${property.images.length}`);

    // עדכון ב-database
    console.log("Express: Mapping property to database format for edit");
    const dbRow = mapPropertyToDb(property);
    console.log("Express: Updating property in database");
    const { error: updateError } = await supabase
      .from("properties")
      .update(dbRow)
      .eq("id", propertyId);
      
    if (updateError) {
      console.error("Update Error:", updateError);
      return res.status(500).json({
        success: false,
        message: `Database update failed: ${updateError.message}`,
      });
    }

    res.json({ success: true, message: "Property updated successfully", images: property.images });
  } catch (error) {
    console.error("Express Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Route לטוגל נכס
app.post('/api/toggle-property', async (req, res) => {
  try {
    console.log("Express: Starting toggle-property request");
    
    // בדיקת הרשאות
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(403).json({ success: false, message: "Invalid or expired session" });
    }

    // בדיקת role
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied, admin role required" });
    }

    const { id, activate } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "Property ID is required" });
    }

    const { error: updateError } = await supabase
      .from("properties")
      .update({ is_active: activate })
      .eq("id", id);

    if (updateError) {
      console.error("Toggle Error:", updateError);
      return res.status(500).json({
        success: false,
        message: `Database update failed: ${updateError.message}`,
      });
    }

    res.json({ success: true, message: "Property status updated successfully" });
  } catch (error) {
    console.error("Express Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

module.exports = app;
