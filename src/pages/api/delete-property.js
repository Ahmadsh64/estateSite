import fs from "fs";
import path from "path";

export async function POST({ request }) {
  try {
    const data = await request.json();
    const id = data.id;
    if (!id) return new Response(JSON.stringify({ success: false, message: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

    const filePath = path.resolve("./src/data/properties.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    let properties = JSON.parse(fileData);

    const index = properties.findIndex(p => p.id === id);
    if (index === -1) {
      return new Response(JSON.stringify({ success: false, message: "Property not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // מחיקת הדירה
    properties.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), "utf-8");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
