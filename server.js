import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import yahooFinance from "yahoo-finance2";

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// แสดงหน้าเว็บเมื่อเปิด URL หลัก
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const SET_TICKERS = [
  "PTT.BK", "ADVANC.BK", "KBANK.BK", "CPALL.BK",
  "SCB.BK", "AOT.BK", "GULF.BK", "DELTA.BK"
];

app.get("/api/stocks", async (req, res) => {
  const { minDiv = 0, maxPE = 999 } = req.query;
  const results = [];

  for (const ticker of SET_TICKERS) {
    try {
      const q = await yahooFinance.quoteSummary(ticker, {
        modules: ["price", "summaryDetail", "financialData"]
      });
      const pe = q.summaryDetail?.trailingPE ?? 0;
      const div = q.summaryDetail?.dividendYield ? q.summaryDetail.dividendYield * 100 : 0;
      const roe = q.financialData?.returnOnEquity ? q.financialData.returnOnEquity * 100 : 0;
      const price = q.price?.regularMarketPrice ?? 0;

      if (div >= minDiv && pe <= maxPE) {
        results.push({ ticker, price, pe: +pe.toFixed(1), div: +div.toFixed(2), roe: +roe.toFixed(1) });
      }
    } catch (e) {}
  }
  res.json(results.sort((a, b) => b.div - a.div));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
