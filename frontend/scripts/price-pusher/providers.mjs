/**
 * providers.mjs
 * -----------------------------------------------------------------
 * Thin adapters over Finnhub and Twelve Data's quote endpoints,
 * normalized to a single `{ TICKER: price }` shape so push.mjs
 * doesn't need to know which provider is configured.
 *
 * Finnhub quote shape (confirmed): GET /quote?symbol=AAPL&token=KEY
 *   -> { c: currentPrice, h, l, o, pc, d, dp }
 *
 * Twelve Data quote shape: GET /quote?symbol=AAPL&apikey=KEY
 *   -> { symbol, close, ... } (price field name verified as `close`
 *   across Twelve Data's time-series-family endpoints; this adapter
 *   also checks `price`/`last` defensively in case the dedicated
 *   /quote endpoint differs slightly — test with `npm run once`
 *   and check the console output before relying on this in prod).
 */

const { STOCK_API_PROVIDER = "finnhub", STOCK_API_KEY } = process.env;

if (!STOCK_API_KEY) {
  console.error(
    "Missing STOCK_API_KEY in .env — get a free key from finnhub.io or twelvedata.com"
  );
  process.exit(1);
}

async function fetchFinnhubQuote(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${STOCK_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub ${ticker} request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (typeof data.c !== "number" || data.c === 0) {
    throw new Error(`Finnhub returned no current price for ${ticker}: ${JSON.stringify(data)}`);
  }
  return data.c;
}

async function fetchTwelveDataQuote(ticker) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(ticker)}&apikey=${STOCK_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data ${ticker} request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.status === "error" || data.code) {
    throw new Error(`Twelve Data error for ${ticker}: ${data.message || JSON.stringify(data)}`);
  }
  const price = Number(data.close ?? data.price ?? data.last);
  if (!Number.isFinite(price) || price === 0) {
    throw new Error(`Twelve Data returned no usable price for ${ticker}: ${JSON.stringify(data)}`);
  }
  return price;
}

async function fetchOne(ticker) {
  if (STOCK_API_PROVIDER === "twelvedata") {
    return fetchTwelveDataQuote(ticker);
  }
  return fetchFinnhubQuote(ticker);
}

/**
 * Fetches quotes for multiple tickers. Each ticker is fetched with a
 * small stagger to stay comfortably under free-tier rate limits
 * (Finnhub free tier: 60/min; Twelve Data free tier: 8/min) — see
 * REQUEST_STAGGER_MS below if you upgrade plans and want this faster.
 *
 * A failure on one ticker does not abort the others; push.mjs treats
 * a missing quote as "skip this asset this tick" rather than failing
 * the whole push.
 */
const REQUEST_STAGGER_MS = STOCK_API_PROVIDER === "twelvedata" ? 1200 : 150;

export async function fetchQuotes(tickers) {
  const results = {};
  for (const ticker of tickers) {
    try {
      results[ticker] = await fetchOne(ticker);
    } catch (err) {
      console.warn(`  ! Quote fetch failed for ${ticker}: ${err.message}`);
      results[ticker] = null;
    }
    await new Promise((r) => setTimeout(r, REQUEST_STAGGER_MS));
  }
  return results;
}
