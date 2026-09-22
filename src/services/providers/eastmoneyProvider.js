const { get } = require("../../utils/httpClient");
const {
  isFund,
  getDecimals,
  safeNumber,
  getLimitPercent,
} = require("../../utils/stockUtils");

const REQUEST_TIMEOUT_MS = 3000;
const SEARCH_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";
const QUOTE_FIELDS = [
  "f1",
  "f2",
  "f3",
  "f4",
  "f6",
  "f12",
  "f13",
  "f14",
  "f18",
  "f31",
  "f32",
  "f124",
].join(",");

function toSecid(code) {
  const normalized = code?.toLowerCase();
  if (!/^(sh|sz|bj)\d{6}$/.test(normalized)) return "";
  return `${normalized.startsWith("sh") ? "1" : "0"}.${normalized.slice(2)}`;
}

function formatDateTime(timestamp) {
  const seconds = safeNumber(timestamp);
  if (seconds <= 0) return "";
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce((result, item) => {
      result[item.type] = item.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function parseStock(code, data) {
  const name = typeof data?.f14 === "string" ? data.f14.trim() : "";
  const close = safeNumber(data?.f18);
  let current = safeNumber(data?.f2);
  const dateTime = formatDateTime(data?.f124);
  if (!name || close <= 0 || !dateTime) return null;
  if (current <= 0) current = close;

  const changeValue = current - close;
  const changePercent = ((changeValue / close) * 100).toFixed(2);
  const isETF = isFund(code, name, current);

  return {
    name,
    code,
    current: current.toFixed(getDecimals(isETF)),
    changeValue: changeValue.toFixed(getDecimals(isETF)),
    changePercent,
    amount: safeNumber(data?.f6),
    isETF,
    dateTime,
    close,
    hasDepth: false,
    buy1Volume: null,
    sell1Volume: null,
    buy1Price: safeNumber(data?.f31),
    sell1Price: safeNumber(data?.f32),
  };
}

function isNearLimit(stock) {
  const limit = getLimitPercent(stock.code, stock.name);
  return Math.abs(safeNumber(stock.changePercent)) >= limit - 0.1;
}

async function getDepth(stock) {
  const numericCode = stock.code.slice(2);
  const url = `https://hsmarketwg.eastmoney.com/api/SHSZQuoteSnapshot?id=${encodeURIComponent(numericCode)}`;
  const data = JSON.parse(
    await get(url, {}, { timeoutMs: REQUEST_TIMEOUT_MS }),
  );
  const expectedMarket = stock.code.toLowerCase().startsWith("sh") ? 1 : 0;
  if (
    data?.code !== numericCode ||
    safeNumber(data?.transMarket) !== expectedMarket ||
    !data.fivequote
  ) {
    return null;
  }

  const buy1Volume = safeNumber(data.fivequote.buy1_count);
  const sell1Volume = safeNumber(data.fivequote.sale1_count);
  const buy1Price = safeNumber(data.fivequote.buy1);
  const sell1Price = safeNumber(data.fivequote.sale1);
  const hasDepth =
    (buy1Price > 0 && buy1Volume > 0) ||
    (sell1Price > 0 && sell1Volume > 0);
  if (!hasDepth) return null;

  return {
    ...stock,
    hasDepth,
    buy1Volume,
    sell1Volume,
    buy1Price,
    sell1Price,
  };
}

async function getStockList(codes, options = {}) {
  const secids = codes.map(toSecid).filter(Boolean);
  if (secids.length !== codes.length) return [];

  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=${QUOTE_FIELDS}&secids=${secids.join(",")}`;
  const response = JSON.parse(
    await get(url, {}, { timeoutMs: REQUEST_TIMEOUT_MS }),
  );
  if (!Array.isArray(response?.data?.diff)) {
    throw new Error("东方财富返回数据无效");
  }

  const requestedDepthCodes =
    options.depthCodes instanceof Set
      ? options.depthCodes
      : new Set(options.depthCodes || []);
  const quoteMap = new Map(
    response.data.diff.map((item) => [`${item.f13}.${item.f12}`, item]),
  );
  const baseStocks = codes
    .map((code) => parseStock(code, quoteMap.get(toSecid(code))))
    .filter(Boolean);

  return Promise.all(
    baseStocks.map(async (stock) => {
      if (
        !isNearLimit(stock) &&
        !options.enableLockTip &&
        !requestedDepthCodes.has(stock.code)
      ) {
        return stock;
      }

      try {
        return (await getDepth(stock)) || stock;
      } catch {
        return stock;
      }
    }),
  );
}

function mapSearchResult(item) {
  const code = String(item?.Code || "").trim();
  const name = String(item?.Name || "").trim();
  const market = String(item?.MktNum ?? "");
  if (!code || !name) return null;

  if ((market === "116" || item.Classify === "HK") && /^\d{1,5}$/.test(code)) {
    return { code: `hk${code.padStart(5, "0")}`, name };
  }
  if (!/^\d{6}$/.test(code)) return null;
  if (
    String(item?.JYS) === "81" ||
    item?.Classify === "NEEQ" ||
    String(item?.SecurityTypeName || "").includes("京")
  ) {
    return { code: `bj${code}`, name };
  }
  if (market === "1") return { code: `sh${code}`, name };
  if (market === "0") return { code: `sz${code}`, name };
  return null;
}

async function searchStocks(keyword) {
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=${SEARCH_TOKEN}&count=10`;
  const response = JSON.parse(
    await get(url, {}, { timeoutMs: REQUEST_TIMEOUT_MS }),
  );
  const items = response?.QuotationCodeTable?.Data;
  if (!Array.isArray(items)) return [];

  const results = [];
  const seen = new Set();
  for (const item of items) {
    const result = mapSearchResult(item);
    if (!result || seen.has(result.code)) continue;
    seen.add(result.code);
    results.push(result);
    if (results.length === 3) break;
  }
  return results;
}

module.exports = { getStockList, searchStocks };
