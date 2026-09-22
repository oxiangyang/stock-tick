const { get, getGbk } = require("../../utils/httpClient");
const { buildTimeSlots } = require("../../utils/tradingTime");
const {
  isFund,
  getDecimals,
  safeNumber,
  formatQuoteDateTime,
} = require("../../utils/stockUtils");

function parseFullQuote(fields, code) {
  const isETF = isFund(code, fields[1], safeNumber(fields[3]));
  const dec = getDecimals(isETF);

  // 20260409114906 -> 2026-04-09 11:49
  const dateTime = formatQuoteDateTime(fields[30]);
  const buy1Volume = safeNumber(fields[10]);
  const sell1Volume = safeNumber(fields[20]);
  const buy1Price = safeNumber(fields[9]);
  const sell1Price = safeNumber(fields[19]);
  const hasDepth =
    (buy1Price > 0 && buy1Volume > 0) ||
    (sell1Price > 0 && sell1Volume > 0);

  return {
    name: fields[1] ?? "",
    code,
    current: safeNumber(fields[3]).toFixed(dec),
    close: safeNumber(fields[4]).toFixed(dec),
    open: safeNumber(fields[5]).toFixed(dec),
    volume: safeNumber(fields[6]),
    changeValue: safeNumber(fields[31]).toFixed(dec),
    changePercent: safeNumber(fields[32]).toFixed(2),
    high: safeNumber(fields[33]).toFixed(dec),
    low: safeNumber(fields[34]).toFixed(dec),
    amount: safeNumber(fields[37]) * 10000,
    turnoverRatio: safeNumber(fields[38]).toFixed(2),
    pe: safeNumber(fields[39]),
    circulationMarket: safeNumber(fields[44]) * 100000000,
    totalMarket: safeNumber(fields[45]) * 100000000,
    pb: safeNumber(fields[46]),
    volumeRatio: safeNumber(fields[49]).toFixed(2),
    avgPrice: safeNumber(fields[51]).toFixed(dec),
    circulatingShares: safeNumber(fields[72]),
    totalShares: safeNumber(fields[73]),
    hasDepth,
    buy1Volume,
    sell1Volume,
    buy1Price,
    sell1Price,
    isETF,
    dateTime,
  };
}

function parseResponse(text, codes) {
  const requestedCodes = new Map(
    codes.map((code) => [code.toLowerCase(), code]),
  );
  const quoteMap = new Map();
  const lines = text
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;

    const key = line
      .slice(0, eqIdx)
      .trim()
      .replace(/^v_/, "")
      .replace(/^s_/, "")
      .toLowerCase();
    const code = requestedCodes.get(key);
    if (!code) continue;

    let raw = line.slice(eqIdx + 1).trim();
    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
    if (!raw) continue;

    const quote = parseFullQuote(raw.split("~"), code);
    if (
      !quote.name ||
      safeNumber(quote.current) <= 0 ||
      safeNumber(quote.close) <= 0 ||
      !quote.dateTime
    ) {
      continue;
    }
    quoteMap.set(code, quote);
  }

  return codes.map((code) => quoteMap.get(code)).filter(Boolean);
}

async function getAStockList(codes) {
  const data = await getGbk(`https://qt.gtimg.cn/?q=${codes.join(",")}`);
  return parseResponse(data, codes);
}

function parseHKResponse(text, codes) {
  const requestedCodes = new Map(
    codes.map((code) => [code.toLowerCase(), code]),
  );
  const quoteMap = new Map();
  const lines = text
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim().replace(/^v_/, "").toLowerCase();
    const code = requestedCodes.get(key);
    if (!code) continue;

    let raw = line.slice(eqIdx + 1).trim();
    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
    if (!raw) continue;

    const fields = raw.split("~");
    const name = fields[1] ?? "";
    const current = safeNumber(fields[3]);
    const close = safeNumber(fields[4]);
    if (!name || current <= 0) continue;

    const changeValue = current - close;
    const changePercent =
      close > 0 ? ((changeValue / close) * 100).toFixed(2) : "0.00";

    // 20260409114906 -> 2026-04-09 11:49
    const dateTime = formatQuoteDateTime(fields[30]);
    quoteMap.set(code, {
      name,
      code,
      current: current.toFixed(3),
      changeValue: changeValue.toFixed(3),
      changePercent,
      amount: safeNumber(fields[37]) * 10000,
      isETF: false,
      isHK: true,
      dateTime,
      close,
      // 港股无涨跌停，封单字段留空
      hasDepth: false,
      buy1Volume: null,
      sell1Volume: null,
      buy1Price: 0,
      sell1Price: 0,
    });
  }

  return codes.map((code) => quoteMap.get(code)).filter(Boolean);
}

async function getHKStockList(codes) {
  const data = await getGbk(`https://qt.gtimg.cn/?q=${codes.join(",")}`);
  return parseHKResponse(data, codes);
}

async function getStockQuoteList(codes) {
  const data = await getGbk(`https://qt.gtimg.cn/?q=${codes.join(",")}`);
  return parseResponse(data, codes);
}

async function getStockMinute(code) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`;
  const text = await get(url);
  const response = JSON.parse(text);
  const stockData = response?.data?.[code];
  const rawDate = stockData?.data?.date;
  if (!rawDate) return [];

  const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  const slots = buildTimeSlots(date);

  // 构建已有数据的时间映射
  const dataMap = new Map();
  if (stockData?.data?.data?.length) {
    for (const itemStr of stockData.data.data) {
      const item = itemStr.split(" ");
      if (item.length !== 4 || !item[0]) continue;
      const time = `${date} ${item[0].slice(0, 2)}:${item[0].slice(2, 4)}`;
      dataMap.set(time, {
        time,
        price: parseFloat(item[1]) || 0,
        volume: parseFloat(item[2]) || 0,
        amount: parseFloat(item[3]) || 0,
      });
    }
  }

  // 按完整时间槽填充，无数据点用 null 占位
  return slots.map(
    (time) =>
      dataMap.get(time) ?? { time, price: null, volume: null, amount: null },
  );
}

module.exports = {
  getAStockList,
  getHKStockList,
  getStockQuoteList,
  getStockMinute,
};
