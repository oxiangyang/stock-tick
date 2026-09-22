/**
 * 股票代码搜索服务
 * 根据名称或关键词搜索沪深、北交所和港股
 */

const { searchStocks } = require("./providers/eastmoneyProvider");

/**
 * 根据股票名称搜索股票代码，返回所有匹配结果
 * @param {string} keyword - 股票名称或关键词
 * @returns {Promise<Array<{code: string, name: string}>|null>} 匹配结果列表，失败返回null
 */
async function searchStockCode(keyword) {
  const trimmed = keyword?.trim();
  if (!trimmed) return null;

  try {
    const results = await searchStocks(trimmed);
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("东方财富股票搜索失败:", error.message);
    return null;
  }
}

module.exports = {
  searchStockCode,
};
