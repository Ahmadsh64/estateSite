import fs from "fs";
import path from "path";
import { Buffer } from "buffer";

export async function POST({ request }) {
  try {
    const formData = await request.formData();

    const id = Number(formData.get("id"));
    const title = formData.get("title");
    const price = formData.get("price");
    const location = formData.get("location");
    const description = formData.get("description");

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

    // קבלת התמונות הקיימות שנשמרו בדף (לא נמחקו)
    const existingImages = formData.getAll("existingImages"); // מערך נתיבים

    // קבלת התמונות החדשות שנבחרו
    const imageFiles = formData.getAll("images");

    const uploadDir = path.resolve("./public/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const newImages = [];

    for (const file of imageFiles) {
      if (file && file.name) {
        const ext = path.extname(file.name);
        const newFileName = `property_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fullPath = path.join(uploadDir, newFileName);
        fs.writeFileSync(fullPath, fileBuffer);
        newImages.push(`/uploads/${newFileName}`);
      }
    }

    // עדכון המערך הסופי: existingImages + newImages
    const finalImages = [...existingImages, ...newImages];

    // עדכון הנתונים
    properties[index] = {
      ...properties[index],
      title,
      price: Number(price),
      location,
      description,
      images: finalImages
    };

    fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), "utf-8");

    return new Response(JSON.stringify({ success: true, images: finalImages }), {
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
