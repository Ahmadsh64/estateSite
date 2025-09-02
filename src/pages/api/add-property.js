import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Buffer } from "buffer";

export async function POST({ request }) {
  try {
    // מקבלים את הנתונים כ-FormData
    const formData = await request.formData();

    const title = formData.get("title");
    const price = formData.get("price");
    const location = formData.get("location");
    const description = formData.get("description");
    const imageFile = formData.get("imageFile");

    // שמירת התמונה בתיקיית public/uploads
    let imagePath = "";
    if (imageFile && imageFile.name) {
      const uploadDir = path.resolve("./public/uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const ext = path.extname(imageFile.name);
      const newFileName = `property_${Date.now()}${ext}`;
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      const fullPath = path.join(uploadDir, newFileName);

      fs.writeFileSync(fullPath, fileBuffer);
      imagePath = `/uploads/${newFileName}`;
    }

    // קריאה ושמירה לקובץ JSON
    const filePath = path.resolve("./src/data/properties.json");
    let properties = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      properties = JSON.parse(fileData);
    }

    const newId = properties.length ? Math.max(...properties.map(p => p.id)) + 1 : 1;

    const newProperty = {
      id: newId,
      title,
      price,
      location,
      description,
      image: imagePath
    };

    properties.push(newProperty);
    fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), "utf-8");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
