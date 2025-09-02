import fs from "fs";
import path from "path";
import { Buffer } from "buffer";

export async function POST({ request }) {
  try {
    // מקבלים FormData במקום JSON
    const formData = await request.formData();

    const id = Number(formData.get("id"));
    const title = formData.get("title");
    const price = formData.get("price");
    const location = formData.get("location");
    const description = formData.get("description");
    const imageFile = formData.get("imageFile"); // אם נבחר קובץ חדש

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing property ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.resolve("./src/data/properties.json");
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ success: false, message: "Properties file not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileData = fs.readFileSync(filePath, "utf-8");
    let properties = JSON.parse(fileData);

    const index = properties.findIndex(p => p.id === id);
    if (index === -1) {
      return new Response(JSON.stringify({ success: false, message: "Property not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let imagePath = properties[index].image; // שמירת התמונה הקיימת
    if (imageFile && imageFile.name) {
      const uploadDir = path.resolve("./public/uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const ext = path.extname(imageFile.name);
      const newFileName = `property_${Date.now()}${ext}`;
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      const fullPath = path.join(uploadDir, newFileName);

      fs.writeFileSync(fullPath, fileBuffer);
      imagePath = `/uploads/${newFileName}`; // נתיב חדש
    }

    // עדכון הנתונים
    properties[index] = {
      ...properties[index],
      title,
      price,
      location,
      description,
      image: imagePath
    };

    fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), "utf-8");

    return new Response(JSON.stringify({ success: true, image: imagePath }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
