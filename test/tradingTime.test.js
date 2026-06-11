const { test } = require("node:test");
const assert = require("node:assert");
const { buildTimeSlots } = require("../src/utils/tradingTime");

test("buildTimeSlots: 共242个时间槽", () => {
  const slots = buildTimeSlots("2026-04-09");
  // 上午 09:30-11:30 共121个 + 下午 13:00-15:00 共121个
  assert.strictEqual(slots.length, 242);
});

test("buildTimeSlots: 首尾及午间边界正确", () => {
  const slots = buildTimeSlots("2026-04-09");
  assert.strictEqual(slots[0], "2026-04-09 09:30");
  assert.strictEqual(slots[120], "2026-04-09 11:30");
  assert.strictEqual(slots[121], "2026-04-09 13:00");
  assert.strictEqual(slots[241], "2026-04-09 15:00");
});

test("buildTimeSlots: 不包含午休时段", () => {
  const slots = buildTimeSlots("2026-04-09");
  assert.ok(!slots.includes("2026-04-09 12:00"));
  assert.ok(!slots.includes("2026-04-09 11:31"));
});
