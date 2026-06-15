// Vercel Serverless Function — proxy de precios del mercado argentino.
const SOURCES = [
  "https://data912.com/live/arg_stocks",
  "https://data912.com/live/arg_bonds",
  "https://data912.com/live/arg_cedears",
  "https://data912.com/live/arg_corp",
];

const SYM_KEYS = ["symbol", "ticker", "simbolo", "especie"];
const PX_KEYS = ["c", "px", "last", "ultimo", "cierre", "close", "px_ask", "px_bid", "precio"];

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

export default async function handler(req, res) {
  const out = {};
  await Promise.all(
    SOURCES.map(async (url) => {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) return;
        const arr = await r.json();
        if (!Array.isArray(arr)) return;
        arr.forEach((it) => {
          const sym = pick(it, SYM_KEYS);
          const px = pick(it, PX_KEYS);
          if (sym && px && +px > 0) out[String(sym).toUpperCase().trim()] = +px;
        });
      } catch (e) {}
    })
  );

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(out);
}
