import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import yahooFinance from "yahoo-finance2";

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const SET_TICKERS = [
  "ADVANC.BK","AOT.BK","BBL.BK","BDMS.BK","BEM.BK","BH.BK","CBG.BK",
  "CPALL.BK","CPF.BK","CPN.BK","CRC.BK","DELTA.BK","GULF.BK","HMPRO.BK",
  "KBANK.BK","KTB.BK","MINT.BK","OR.BK","PTT.BK","PTTEP.BK","PTTGC.BK",
  "SCB.BK","SCC.BK","TISCO.BK","TOP.BK","TRUE.BK","TTB.BK","TU.BK",
  "WHA.BK","EA.BK","GLOBAL.BK","BCH.BK","SIRI.BK","SPALI.BK","BGRIM.BK"
];

// ดึงข้อมูลหุ้น 1 ตัว
async function fetchStock(ticker) {
  try {
    const q = await yahooFinance.quoteSummary(ticker, {
      modules: ["price", "summaryDetail", "financialData"]
    });
    const pe = q.summaryDetail?.trailingPE ?? 0;
    const div = q.summaryDetail?.dividendYield ? q.summaryDetail.dividendYield * 100 : 0;
    const roe = q.financialData?.returnOnEquity ? q.financialData.returnOnEquity * 100 : 0;
    const price = q.price?.regularMarketPrice ?? 0;
    return { ticker, price, pe, div, roe };
  } catch (e) {
    return null;
  }
}

app.get("/api/stocks", async (req, res) => {
  const { minDiv = 0, maxPE = 999 } = req.query;
  const results = [];

  // ดึงพร้อมกันทีละ 5 ตัว (เร็วขึ้น ~5 เท่า)
  for (let i = 0; i < SET_TICKERS.length; i += 5) {
    const batch = SET_TICKERS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(fetchStock));
    for (const s of batchResults) {
      if (s && s.div >= minDiv && s.pe <= maxPE) {
        results.push(s);
      }
    }
  }
  res.json(results.sort((a, b) => b.div - a.div));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
