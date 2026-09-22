/**
 * 股票数据服务
 * 获取股票实时数据，支持批量查询
 */

const { isHKStock } = require("../utils/stockUtils");
const eastmoneyProvider = require("./providers/eastmoneyProvider");
const tencentProvider = require("./providers/tencentProvider");
const quoteResilience = require("./quoteResilience");

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
        aResults.find((stock) => stock?.code === code) ||
        hkResults.find((stock) => stock?.code === code),
    )
    .filter(Boolean);
}

async function getAStockList(codes, options) {
  let eastmoneyResults = [];
  let primaryError = null;
  const shouldTryPrimary = quoteResilience.beginPrimaryRequest();

  if (shouldTryPrimary) {
    try {
      eastmoneyResults = await eastmoneyProvider.getStockList(codes, options);
      quoteResilience.recordPrimarySuccess();
    } catch (error) {
      primaryError = error;
      quoteResilience.recordPrimaryFailure(error);
    }
  }

  const missingCodes = codes.filter(
    (code) => !eastmoneyResults.some((stock) => stock.code === code),
  );
  if (!missingCodes.length) return eastmoneyResults;

  const reason = !shouldTryPrimary
    ? "东方财富熔断中"
    : primaryError
      ? "东方财富请求失败"
      : "东方财富部分数据缺失";
  quoteResilience.recordFallback(missingCodes, reason);

  let tencentResults = [];
  try {
    tencentResults = await tencentProvider.getAStockList(missingCodes);
    quoteResilience.recordFallbackSuccess();
  } catch (error) {
    quoteResilience.recordFallbackFailure(error);
  }

  return codes
    .map(
      (code) =>
        eastmoneyResults.find((stock) => stock.code === code) ||
        tencentResults.find((stock) => stock.code === code),
    )
    .filter(Boolean);
}

/**
 * 批量获取股票信息（自动区分A股和港股）
 * @param {string[]} codes - 股票代码数组，如 ['sh600519', 'hk00700']
 * @returns {Promise<Array>} 股票信息数组
 */
async function getStockList(codes, options = {}) {
  if (!codes?.length) return [];

  const hkCodes = codes.filter(isHKStock);
  const aCodes = codes.filter((code) => !isHKStock(code));
  const [aResults, hkResults] = await Promise.all([
    aCodes.length ? getAStockList(aCodes, options) : [],
    hkCodes.length ? getHKStockList(hkCodes) : [],
  ]);

  // 按原始顺序合并结果
  return mergeByCodeOrder(codes, aResults, hkResults);
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
    return await tencentProvider.getHKStockList(codes);
  } catch (error) {
    console.error(`获取港股数据失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取股票详细行情列表
 * @param {string[]} codes - 股票代码数组
 * @returns {Promise<Array>} 股票详细信息数组
 */
async function getStockQuoteList(codes) {
  if (!codes?.length) return [];

  const hkCodes = codes.filter(isHKStock);
  const aCodes = codes.filter((code) => !isHKStock(code));
  try {
    const [aResults, hkResults] = await Promise.all([
      aCodes.length ? tencentProvider.getStockQuoteList(aCodes) : [],
      hkCodes.length ? tencentProvider.getHKStockList(hkCodes) : [],
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
    return await tencentProvider.getStockMinute(code);
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
  getQuoteResilienceStatus: quoteResilience.getStatus,
};
