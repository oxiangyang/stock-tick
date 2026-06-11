const { test } = require("node:test");
const assert = require("node:assert");
const {
  isFund,
  getDecimals,
  safeNumber,
  isValidStockCode,
  isHKStock,
  getLimitPercent,
  formatAmount,
  formatQuoteDateTime,
} = require("../src/utils/stockUtils");

test("isFund: 沪市5开头为基金", () => {
  assert.strictEqual(isFund("sh510300", "沪深300ETF", 4), true);
});

test("isFund: 深市1开头为基金", () => {
  assert.strictEqual(isFund("sz159915", "创业板ETF", 2), true);
});

test("isFund: 普通股票非基金", () => {
  assert.strictEqual(isFund("sh600519", "贵州茅台", 1800), false);
});

test("isFund: 名称含ETF判定为基金", () => {
  assert.strictEqual(isFund("sh600000", "某某ETF", 5), true);
});

test("getDecimals: ETF为3位，否则2位", () => {
  assert.strictEqual(getDecimals(true), 3);
  assert.strictEqual(getDecimals(false), 2);
});

test("safeNumber: 合法数字", () => {
  assert.strictEqual(safeNumber("12.34"), 12.34);
});

test("safeNumber: 非法值返回0", () => {
  assert.strictEqual(safeNumber("abc"), 0);
  assert.strictEqual(safeNumber(undefined), 0);
  assert.strictEqual(safeNumber(""), 0);
});

test("isValidStockCode: 合法A股代码", () => {
  assert.strictEqual(isValidStockCode("sh600519"), true);
  assert.strictEqual(isValidStockCode("sz000001"), true);
  assert.strictEqual(isValidStockCode("bj899050"), true);
});

test("isValidStockCode: 合法港股代码", () => {
  assert.strictEqual(isValidStockCode("hk00700"), true);
});

test("isValidStockCode: 非法代码", () => {
  assert.strictEqual(isValidStockCode("600519"), false);
  assert.strictEqual(isValidStockCode("sh60051"), false);
  assert.strictEqual(isValidStockCode("hk0070"), false);
  assert.strictEqual(isValidStockCode(""), false);
  assert.strictEqual(isValidStockCode(null), false);
});

test("isHKStock: 港股识别", () => {
  assert.strictEqual(isHKStock("hk00700"), true);
  assert.strictEqual(isHKStock("HK00700"), true);
  assert.strictEqual(isHKStock("sh600519"), false);
  assert.strictEqual(isHKStock(null), false);
});

test("getLimitPercent: ST股5%", () => {
  assert.strictEqual(getLimitPercent("sh600000", "ST某某"), 5);
});

test("getLimitPercent: 创业板/科创板20%", () => {
  assert.strictEqual(getLimitPercent("sz300001", "某某"), 20);
  assert.strictEqual(getLimitPercent("sh688001", "某某"), 20);
});

test("getLimitPercent: 北交所30%", () => {
  assert.strictEqual(getLimitPercent("bj899050", "某某"), 30);
});

test("getLimitPercent: 主板默认10%", () => {
  assert.strictEqual(getLimitPercent("sh600519", "贵州茅台"), 10);
});

test("formatAmount: 亿/万/元单位", () => {
  assert.strictEqual(formatAmount(150000000), "1.5亿");
  assert.strictEqual(formatAmount(50000), "5万");
  assert.strictEqual(formatAmount(888), "888元");
});

test("formatQuoteDateTime: 14位时间戳", () => {
  assert.strictEqual(formatQuoteDateTime("20260409114906"), "2026-04-09 11:49");
});

test("formatQuoteDateTime: 长度不符返回空串", () => {
  assert.strictEqual(formatQuoteDateTime("2026"), "");
  assert.strictEqual(formatQuoteDateTime(""), "");
  assert.strictEqual(formatQuoteDateTime(undefined), "");
});
