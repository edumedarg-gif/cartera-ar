// api/prices.js — Cartera·AR
// Proxy de precios del mercado argentino (fuente: data912.com, pública, sin API key).
// Vercel expone este archivo automáticamente en  https://<tu-sitio>/api/prices
// Devuelve un mapa  { SIMBOLO: precioARS }  que el front usa para los precios en vivo
// de acciones, CEDEARs, bonos y ONs. La cripto y el dólar van por otras fuentes.
//
// Nota: data912 es data de mercado con leve demora (no tick a tick), suficiente para
// seguimiento. Si falla, devuelve {} y la app mantiene los últimos precios cargados.

const PANELS = ["arg_stocks", "arg_cedears", "arg_bonds", "arg_corp", "arg_notes"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // cache en el edge de Vercel: 2 min fresco, hasta 5 min "stale" mientras revalida
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  try {
    const panels = await Promise.allSettled(
      PANELS.map((p) =>
        fetch("https://data912.com/live/" + p, { headers: { accept: "application/json" } })
          .then((r) => (r.ok ? r.json() : []))
      )
    );

    const map = {};
    for (const result of panels) {
      if (result.status !== "fulfilled" || !Array.isArray(result.value)) continue;
      for (const it of result.value) {
        const sym = String(it.symbol || it.ticker || "").toUpperCase().trim();
        if (!sym) continue;
        // precio: último operado (c); si no, promedio bid/ask; si no, el que haya
        let px = Number(it.c);
        if (!(px > 0)) {
          const bid = Number(it.px_bid), ask = Number(it.px_ask);
          if (bid > 0 && ask > 0) px = (bid + ask) / 2;
          else px = ask > 0 ? ask : bid > 0 ? bid : 0;
        }
        if (px > 0 && map[sym] == null) map[sym] = px;
      }
    }

    res.status(200).json(map);
  } catch (e) {
    res.status(200).json({});
  }
};
