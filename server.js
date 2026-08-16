import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 📊 อ่านรายชื่อหุ้นจาก Firebase
app.get("/api/stocks", async (req, res) => {
  const { minDiv = 0, maxPE = 999 } = req.query;
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
      if (stock.div >= minDiv && stock.pe <= maxPE) {
        stocks.push(stock);
      }
    });

    res.json(stocks.sort((a, b) => b.div - a.div));
  } catch (e) {
    console.error("Firebase error:", e.message);
    res.status(500).json({ error: "อ่านข้อมูลไม่ได้" });
  }
});

// ➕ เพิ่ม/แก้ไขข้อมูลหุ้น (บันทึกลง Firebase)
app.post("/api/stocks", async (req, res) => {
  const { ticker, price, pe, div, roe } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: "ต้องใส่ชื่อหุ้น" });
  }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
