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

// ⭐ รายชื่อหุ้น SET50 + SET100 (70 ตัว)
const SET_TICKERS = [
  // SET50
  "ADVANC.BK","AOT.BK","AWC.BK","BANPU.BK","BBL.BK","BCP.BK","BDMS.BK",
  "BEM.BK","BH.BK","BJC.BK","BTS.BK","CBG.BK","CCET.BK","COM7.BK",
  "CPALL.BK","CPF.BK","CPN.BK","CRC.BK","DELTA.BK","EGCO.BK","GPSC.BK",
  "GULF.BK","HMPRO.BK","IVL.BK","KBANK.BK","KCE.BK","KKP.BK","KTB.BK",
  "KTC.BK","LH.BK","MINT.BK","MTC.BK","OR.BK","OSP.BK","PTT.BK",
  "PTTEP.BK","PTTGC.BK","RATCH.BK","SCB.BK","SCC.BK","SCGP.BK","TCAP.BK",
  "TIDLOR.BK","TISCO.BK","TLI.BK","TOP.BK","TRUE.BK","TTB.BK","TU.BK",
  "VGI.BK","WHA.BK",
  // SET100 เพิ่มเติม
  "BA.BK","BCH.BK","BGRIM.BK","CK.BK","CKP.BK","EA.BK","ERW.BK",
  "GLOBAL.BK","HANA.BK","JMT.BK","QH.BK","SAWAD.BK","SIRI.BK","SPALI.BK",
  "STA.BK","STGT.BK","TASCO.BK","TOA.BK","TPIPL.BK"
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
