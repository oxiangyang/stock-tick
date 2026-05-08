/**
 * 股票搜索服务
 * 根据股票名称搜索股票代码
 */

const { getGbk } = require("../utils/httpClient");

/**
 * 根据股票名称搜索股票代码，返回所有匹配结果
 * @param {string} keyword - 股票名称或关键词
 * @returns {Promise<Array<{code: string, name: string}>|null>} 匹配结果列表，失败返回null
 */
async function searchStockCode(keyword) {
  const trimmed = keyword?.trim();
  if (!trimmed) return null;

  try {
    return await searchBySina(trimmed);
  } catch (error) {
    console.error("股票搜索失败:", error.message);
    return null;
  }
}

/**
 * 使用新浪API搜索股票（支持A股和港股）
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array<{code: string, name: string}>|null>} 匹配结果列表
 */
async function searchBySina(keyword) {
  try {
    // type 包含 31-35 为港股
    const url = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15,21,22,23,24,25,31,32,33,34,35&key=${encodeURIComponent(
      keyword,
    )}`;
    const data = await getGbk(url);
    const match = data.match(/var suggestvalue="([^"]+)"/);

    if (match?.[1]) {
      const results = [];
      const items = match[1].split(";").filter((item) => item.trim());
      for (const item of items) {
        const parts = item.split(",");
        const fullCode = parts[3];
        const type = parts[1];
        const name = parts[4]?.trim() || "";

        // A股：sh/sz 开头 + 6位数字
        if (fullCode?.match(/^(sh|sz)\d{6}$/)) {
          results.push({ code: fullCode, name });
          continue;
        }

        // 港股：type 为 31-35，代码为纯数字，补齐5位后加 hk 前缀
        if (type && parseInt(type) >= 31 && parseInt(type) <= 35) {
          const rawCode = parts[2]?.trim();
          if (rawCode && /^\d+$/.test(rawCode)) {
            results.push({ code: `hk${rawCode.padStart(5, "0")}`, name });
          }
        }
      }
      return results.length > 0 ? results.slice(0, 3) : null;
    }
  } catch (error) {
    console.error("新浪搜索失败:", error.message);
  }

  return null;
}

module.exports = {
  searchStockCode,
};
