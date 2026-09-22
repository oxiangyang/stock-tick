// HTTP 请求工具，基于 VS Code 内置的全局 fetch
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// 特殊域名 Referer 映射
const REFERER_MAP = {
  "eastmoney.com": "https://quote.eastmoney.com",
  "gtimg.cn": "https://gu.qq.com",
};

// 构造 fetch 配置，自动注入 Referer
function buildOptions(url, extraHeaders = {}, requestOptions = {}) {
  const timeoutMs = Number.isFinite(requestOptions.timeoutMs)
    ? requestOptions.timeoutMs
    : 10000;
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    const { protocol, hostname } = new URL(url);
    const matched = Object.keys(REFERER_MAP).find((key) =>
      hostname.endsWith(key),
    );
    const origin = matched
      ? REFERER_MAP[matched]
      : `${protocol}//www.${hostname}`;
    return {
      headers: { "User-Agent": UA, Referer: origin, ...extraHeaders },
      signal,
    };
  } catch {
    return { headers: { "User-Agent": UA, ...extraHeaders }, signal };
  }
}

// GET 请求，返回文本
async function get(url, extraHeaders = {}, requestOptions = {}) {
  const res = await fetch(
    url,
    buildOptions(url, extraHeaders, requestOptions),
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// GET 请求，返回 GBK 解码后的字符串
async function getGbk(url, extraHeaders = {}, requestOptions = {}) {
  const res = await fetch(
    url,
    buildOptions(url, extraHeaders, requestOptions),
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("gbk").decode(buf);
}

module.exports = { get, getGbk };
