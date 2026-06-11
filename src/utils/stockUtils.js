/**
 * 股票相关工具函数
 */

/**
 * 判断是否为基金/ETF
 * @param {string} code - 股票代码（小写，如 sh600519）
 * @param {string} name - 股票名称
 * @param {number} current - 当前价格
 * @returns {boolean}
 */
function isFund(code, name, current) {
  const codeNum = code.substring(2);
  const isFundByCode =
    (code.startsWith("sh") && codeNum.startsWith("5")) ||
    (code.startsWith("sz") && codeNum.startsWith("1"));
  return (
    isFundByCode ||
    (name && (name.includes("ETF") || name.includes("LOF"))) ||
    (current > 0 &&
      current < 3 &&
      name &&
      (name.includes("基金") || name.includes("指数")))
  );
}

/**
 * 获取价格精度小数位数
 * @param {boolean} isETF - 是否为基金
 * @returns {number}
 */
function getDecimals(isETF) {
  return isETF ? 3 : 2;
}

/**
 * 安全转换为数字
 * @param {string} val - 原始值
 * @returns {number}
 */
function safeNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * 验证股票代码格式
 * @param {string} code - 股票代码
 * @returns {boolean} 是否为有效格式
 */
function isValidStockCode(code) {
  if (!code || typeof code !== "string") {
    return false;
  }
  // A股：sh/sz/bj + 6位数字；港股：hk + 5位数字
  return /^(sh|sz|bj)[0-9]{6}$/i.test(code) || /^hk[0-9]{5}$/i.test(code);
}

/**
 * 判断是否为港股
 * @param {string} code - 股票代码
 * @returns {boolean}
 */
function isHKStock(code) {
  return typeof code === "string" && code.toLowerCase().startsWith("hk");
}

/**
 * 获取股票涨跌幅限制
 * @param {string} code - 股票代码
 * @param {string} name - 股票名称
 * @returns {number} 涨跌幅限制（百分比）
 */
function getLimitPercent(code, name) {
  if (name && /ST/i.test(name)) return 5;
  if (code.startsWith("sz30")) return 20;
  if (code.startsWith("sh68")) return 20;
  if (code.startsWith("bj")) return 30;
  return 10;
}

/**
 * 格式化金额
 * @param {number} amount - 金额（元）
 * @returns {string} 格式化后的金额
 */
function formatAmount(amount) {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(1) + "亿";
  }
  if (amount >= 10000) {
    return (amount / 10000).toFixed(0) + "万";
  }
  return Math.round(amount) + "元";
}

/**
 * 格式化行情时间戳
 * 将腾讯接口的 14 位时间戳转为可读格式
 * 20260409114906 -> 2026-04-09 11:49
 * @param {string} raw - 14 位时间戳字符串
 * @returns {string} 格式化后的时间，长度不符时返回空串
 */
function formatQuoteDateTime(raw) {
  if (typeof raw !== "string" || raw.length !== 14) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
}

module.exports = {
  isFund,
  getDecimals,
  safeNumber,
  isValidStockCode,
  isHKStock,
  getLimitPercent,
  formatAmount,
  formatQuoteDateTime,
};
