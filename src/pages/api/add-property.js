import fs from "fs";
import path from "path";
import { Buffer } from "buffer";

export async function POST({ request }) {
  try {
    // מקבלים את הנתונים כ-FormData
    const formData = await request.formData();

    const title = formData.get("title");
    const price = formData.get("price");
    const location = formData.get("location");
    const description = formData.get("description");
    const imageFiles = formData.getAll("images");

    const uploadDir = path.resolve("./public/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // שמירת כל התמונות במערך
    const images = [];

    for (const file of imageFiles) {
      if (file && file.name) {
        const ext = path.extname(file.name);
        const newFileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fullPath = path.join(uploadDir, newFileName);
        fs.writeFileSync(fullPath, fileBuffer);
        images.push(`/uploads/${newFileName}`);
      }
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
      price: Number(price),
      location,
      description,
      images // ⬅️ שומר מערך תמונות
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
