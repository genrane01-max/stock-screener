import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

// ✅ เชื่อม Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

const db = admin.firestore();

// ✅ เชื่อม Gemini AI (ใช้ key จาก Render)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // รองรับรูปใหญ่

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🏷️ แบ่งหมวดหุ้น
function getCategory(s) {
  if (s.div >= 5 && s.pe < 15 && s.roe > 10) return "dividend";
  if (s.roe > 15 && s.pe > 20) return "growth";
  return "other";
}

// 📊 อ่านรายชื่อหุ้น
app.get("/api/stocks", async (req, res) => {
  try {
    const snapshot = await db.collection("stocks").get();
    const stocks = [];
    snapshot.forEach(doc => {
      const s = doc.data();
      const stock = {
        ticker: doc.id,
        price: s.price || 0,
        pe: s.pe || 0,
        div: s.div || 0,
        roe: s.roe || 0
      };
      stock.category = getCategory(stock);
      stocks.push(stock);
    });
    res.json(stocks);
  } catch (e) {
    console.error("Firebase error:", e.message);
    res.status(500).json({ error: "อ่านข้อมูลไม่ได้" });
  }
});

// ➕ เพิ่ม/แก้ไขข้อมูลหุ้น
app.post("/api/stocks", async (req, res) => {
  const { ticker, price, pe, div, roe } = req.body;
  if (!ticker) return res.status(400).json({ error: "ต้องใส่ชื่อหุ้น" });

  try {
    await db.collection("stocks").doc(ticker.toUpperCase()).set({
      price: Number(price) || 0,
      pe: Number(pe) || 0,
      div: Number(div) || 0,
      roe: Number(roe) || 0,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true, message: "บันทึก " + ticker.toUpperCase() + " เรียบร้อย" });
  } catch (e) {
    console.error("Save error:", e.message);
    res.status(500).json({ error: "บันทึกไม่ได้" });
  }
});

// 🤖 สแกนรูปสกรีนช็อต → AI อ่านค่า
app.post("/api/scan", async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: "ไม่มีรูป" });
  }

  try {
    const prompt = `อ่านข้อมูลหุ้นจากภาพสกรีนช็อตนี้ แล้วตอบเป็น JSON เท่านั้น
รูปแบบ:
{
  "stocks": [
    { "ticker": "PTT", "price": 32.5, "pe": 8.5, "div": 4.2, "roe": 12.3 }
  ]
}
กฎ:
- ticker = ชื่อย่อหุ้น (เช่น PTT, KBANK)
- price = ราคา, pe = P/E, div = ปันผลเป็น %, roe = ROE เป็น %
- อ่านได้กี่ตัวก็ตอบเท่านั้น ห้ามเดา
- ถ้าอ่านไม่ได้เลยให้ตอบ { "stocks": [] }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } },
        prompt
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    let result;
    try {
      result = JSON.parse(response.text);
    } catch (e) {
      result = { stocks: [] };
    }

    res.json(result);
  } catch (e) {
    console.error("Scan error:", e.message);
    res.status(500).json({ error: "สแกนไม่ได้: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
