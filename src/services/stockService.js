/**
 * 股票数据服务
 * 获取股票实时数据，支持批量查询
 */

const { get, getGbk } = require("../utils/httpClient");
const { buildTimeSlots } = require("../utils/tradingTime");
const {
  isFund,
  getDecimals,
  safeNumber,
  isHKStock,
  formatQuoteDateTime,
} = require("../utils/stockUtils");

/**
 * 按原始 codes 顺序合并 A 股与港股结果，过滤无效项
 * @param {string[]} codes - 原始代码顺序
 * @param {Array} aResults - A 股结果
 * @param {Array} hkResults - 港股结果
 * @returns {Array}
 */
function mergeByCodeOrder(codes, aResults, hkResults) {
  return codes
    .map(
      (code) =>
        aResults.find((s) => s?.code === code) ||
        hkResults.find((s) => s?.code === code),
    )
    .filter(Boolean);
}

/**
 * 批量获取股票信息（自动区分A股和港股）
 * @param {string[]} codes - 股票代码数组，如 ['sh600519', 'hk00700']
 * @param {boolean} isSina - A股是否使用新浪源（默认 true）
 * @returns {Promise<Array>} 股票信息数组
 */
async function getStockList(codes, isSina = true) {
  if (!codes?.length) return [];

  const hkCodes = codes.filter(isHKStock);
  const aCodes = codes.filter((c) => !isHKStock(c));

  const [aResults, hkResults] = await Promise.all([
    aCodes.length ? getAStockList(aCodes, isSina) : [],
    hkCodes.length ? getHKStockList(hkCodes) : [],
  ]);

  // 按原始顺序合并结果
  return mergeByCodeOrder(codes, aResults, hkResults);
}

/**
 * 批量获取A股信息
 * @param {string[]} codes - A股代码数组
 * @param {boolean} isSina - 是否使用新浪源
 * @returns {Promise<Array>}
 */
async function getAStockList(codes, isSina = true) {
  if (!codes?.length) return [];

  try {
    if (isSina) {
      const url = `https://hq.sinajs.cn/list=${codes.join(",")}`;
      const data = await getGbk(url);
      return data
        .split("\n")
        .map((line) => {
          const match = line.match(/var hq_str_([^=]+)="([^"]+)"/);
          if (
            match?.[1] &&
            match[2] &&
            codes.includes(match[1].toLowerCase())
          ) {
            return parseSinaStockData(match[1].toLowerCase(), match[2]);
          }
          return null;
        })
        .filter(Boolean);
    }

    const url = `https://qt.gtimg.cn/?q=${codes.map((code) => `s_${code}`).join(",")}`;
    const data = await getGbk(url);
    return parseTencentResponse(data, codes, true);
  } catch (error) {
    console.error(`获取A股数据失败: ${error.message}`);
    return [];
  }
}

/**
 * 批量获取港股信息（腾讯行情源）
 * 港股代码格式：hk00700，腾讯接口需要传 hk00700
 * @param {string[]} codes - 港股代码数组，如 ['hk00700']
 * @returns {Promise<Array>}
 */
async function getHKStockList(codes) {
  if (!codes?.length) return [];

  try {
    const url = `https://qt.gtimg.cn/?q=${codes.join(",")}`;
    const data = await getGbk(url);
    return parseTencentHKResponse(data, codes);
  } catch (error) {
    console.error(`获取港股数据失败: ${error.message}`);
    return [];
  }
}

/**
 * 解析腾讯港股行情响应
 * 腾讯港股字段与A股略有差异，价格单位为港元
 * @param {string} text - 响应文本
 * @param {string[]} codes - 港股代码数组
 * @returns {Array}
 */
function parseTencentHKResponse(text, codes) {
  const lines = text
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const eqIdx = line.indexOf("=");
      if (eqIdx < 0) return null;

      let raw = line.slice(eqIdx + 1).trim();
      if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
      if (!raw) return null;

      const fields = raw.split("~");
      const code = codes[index];
      if (!code) return null;

      const name = fields[1] ?? "";
      const current = safeNumber(fields[3]);
      const close = safeNumber(fields[4]);
      if (!name || current <= 0) return null;

      const changeValue = current - close;
      const changePercent = close > 0 ? ((changeValue / close) * 100).toFixed(2) : "0.00";

      // 20260409114906 -> 2026-04-09 11:49
      const dateTime = formatQuoteDateTime(fields[30]);

      return {
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
        buy1Volume: 0,
        sell1Volume: 0,
        buy1Price: 0,
        sell1Price: 0,
      };
    })
    .filter(Boolean);
}

/**
 * 解析新浪股票数据
 * @param {string} code - 股票代码
 * @param {string} data - 原始数据字符串
 * @returns {Object|null} 解析后的股票信息
 */
function parseSinaStockData(code, data) {
  const parts = data.split(",");
  if (parts.length < 32) return null;

  const name = parts[0]?.trim() || "";
  const close = parseFloat(parts[2]) || 0;
  let current = parseFloat(parts[3]) || 0;
  const amount = parseFloat(parts[9]) || 0;

  if (!name || close <= 0 || !parts[30] || !parts[31]) return null;

  // 开盘前当前价为0，使用昨收价
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
    amount,
    isETF,
    dateTime: `${parts[30]} ${parts[31]}`,
    close,
    buy1Volume: Math.round(parseFloat(parts[10]) / 100) || 0,
    sell1Volume: Math.round(parseFloat(parts[20]) / 100) || 0,
    buy1Price: parseFloat(parts[6]) || 0,
    sell1Price: parseFloat(parts[7]) || 0,
  };
}

/**
 * 解析完整行情数据（腾讯源）
 * @param {string[]} fields - 字段数组
 * @param {string} code - 股票代码
 * @returns {Object} 解析后的股票信息
 */
function parseFullQuote(fields, code) {
  const isETF = isFund(code, fields[1], safeNumber(fields[3]));
  const dec = getDecimals(isETF);

  // 20260409114906 -> 2026-04-09 11:49
  const dateTime = formatQuoteDateTime(fields[30]);

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
    isETF,
    dateTime,
  };
}

/**
 * 解析简单行情数据（腾讯源）
 * @param {string[]} fields - 字段数组
 * @param {string} code - 股票代码
 * @returns {Object} 解析后的股票信息
 */
function parseSimpleQuote(fields, code) {
  const isETF = isFund(code, fields[1], safeNumber(fields[3]));
  const dec = getDecimals(isETF);

  return {
    name: fields[1],
    code,
    current: safeNumber(fields[3]).toFixed(dec),
    changeValue: safeNumber(fields[4]).toFixed(dec),
    changePercent: safeNumber(fields[5]).toFixed(2),
    amount: safeNumber(fields[7]),
    isETF,
    dateTime: "",
    close: undefined,
    buy1Volume: undefined,
    sell1Volume: undefined,
    buy1Price: undefined,
    sell1Price: undefined,
  };
}

/**
 * 解析腾讯行情响应
 * @param {string} text - 响应文本
 * @param {string[]} codes - 股票代码数组
 * @param {boolean} isSimple - 是否使用简版解析
 * @returns {Array} 股票信息数组
 */
function parseTencentResponse(text, codes, isSimple = false) {
  const lines = text
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const eqIdx = line.indexOf("=");
      if (eqIdx < 0) return null;

      let key = line.slice(0, eqIdx).trim();
      if (key.startsWith("v_")) key = key.slice(2);

      let raw = line.slice(eqIdx + 1).trim();
      if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);

      const fields = raw.split("~");
      const code = codes[index];
      return isSimple
        ? parseSimpleQuote(fields, code)
        : parseFullQuote(fields, code);
    })
    .filter(Boolean);
}

/**
 * 获取股票详细行情列表
 * @param {string[]} codes - 股票代码数组
 * @returns {Promise<Array>} 股票详细信息数组
 */
async function getStockQuoteList(codes) {
  if (!codes?.length) return [];

  const hkCodes = codes.filter(isHKStock);
  const aCodes = codes.filter((c) => !isHKStock(c));

  try {
    const [aResults, hkResults] = await Promise.all([
      aCodes.length ? (async () => {
        const url = `https://qt.gtimg.cn/?q=${aCodes.join(",")}`;
        const res = await getGbk(url);
        return res ? parseTencentResponse(res, aCodes) : [];
      })() : [],
      hkCodes.length ? getHKStockList(hkCodes) : [],
    ]);

    return mergeByCodeOrder(codes, aResults, hkResults);
  } catch (error) {
    console.error(`获取股票详细行情失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取股票分时数据
 * @param {string} code - 股票代码，如 sh600519
 * @returns {Promise<Array>} 分时数据数组（含 null 占位，共 242 个时间槽）
 */
async function getStockMinute(code) {
  try {
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`;
    const text = await get(url);
    const res = JSON.parse(text);
    const stockData = res?.data?.[code];
    const d = stockData?.data?.date;
    if (!d) return [];

    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
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
  } catch (error) {
    console.error(`获取分时数据失败: ${error.message}`);
    return [];
  }
}

module.exports = {
  getStockList,
  getStockMinute,
  getStockQuoteList,
  getHKStockList,
};
