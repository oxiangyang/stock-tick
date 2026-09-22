const FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30000;
const FALLBACK_LOG_INTERVAL_MS = 30000;

const state = {
  circuitState: "closed",
  consecutivePrimaryFailures: 0,
  totalPrimaryFailures: 0,
  fallbackRequests: 0,
  fallbackSymbols: 0,
  fallbackFailures: 0,
  openedAt: 0,
  nextProbeAt: 0,
  lastPrimarySuccessAt: 0,
  lastFallbackAt: 0,
  lastFallbackSuccessAt: 0,
  lastError: "",
  lastFallbackSignature: "",
  lastFallbackLogAt: 0,
};

function beginPrimaryRequest(now = Date.now()) {
  if (state.circuitState === "closed") return true;
  if (state.circuitState === "half-open") return false;
  if (now < state.nextProbeAt) return false;

  state.circuitState = "half-open";
  console.info("东方财富行情熔断结束，开始探测恢复");
  return true;
}

function recordPrimarySuccess(now = Date.now()) {
  const recovered =
    state.circuitState !== "closed" || state.consecutivePrimaryFailures > 0;
  state.circuitState = "closed";
  state.consecutivePrimaryFailures = 0;
  state.openedAt = 0;
  state.nextProbeAt = 0;
  state.lastPrimarySuccessAt = now;
  state.lastError = "";
  if (recovered) console.info("东方财富行情已恢复，停止腾讯容灾");
}

function recordPrimaryFailure(error, now = Date.now()) {
  state.consecutivePrimaryFailures += 1;
  state.totalPrimaryFailures += 1;
  state.lastError = error?.message || String(error);

  if (
    state.circuitState === "half-open" ||
    state.consecutivePrimaryFailures >= FAILURE_THRESHOLD
  ) {
    state.circuitState = "open";
    state.openedAt = now;
    state.nextProbeAt = now + CIRCUIT_COOLDOWN_MS;
    console.error(
      `东方财富行情连续失败，已熔断 ${CIRCUIT_COOLDOWN_MS / 1000} 秒: ${state.lastError}`,
    );
    return;
  }

  if (state.consecutivePrimaryFailures === 1) {
    console.warn(`东方财富行情获取失败，启用腾讯容灾: ${state.lastError}`);
  }
}

function recordFallback(codes, reason, now = Date.now()) {
  state.fallbackRequests += 1;
  state.fallbackSymbols += codes.length;
  state.lastFallbackAt = now;

  const signature = `${reason}:${codes.join(",")}`;
  if (
    signature !== state.lastFallbackSignature ||
    now - state.lastFallbackLogAt >= FALLBACK_LOG_INTERVAL_MS
  ) {
    console.warn(`腾讯行情容灾已启用（${reason}）: ${codes.join(", ")}`);
    state.lastFallbackSignature = signature;
    state.lastFallbackLogAt = now;
  }
}

function recordFallbackSuccess(now = Date.now()) {
  state.lastFallbackSuccessAt = now;
}

function recordFallbackFailure(error) {
  state.fallbackFailures += 1;
  console.error(`腾讯容灾行情获取失败: ${error?.message || String(error)}`);
}

function getStatus(now = Date.now()) {
  return {
    ...state,
    circuitRemainingMs:
      state.circuitState === "open"
        ? Math.max(0, state.nextProbeAt - now)
        : 0,
  };
}

module.exports = {
  beginPrimaryRequest,
  recordPrimarySuccess,
  recordPrimaryFailure,
  recordFallback,
  recordFallbackSuccess,
  recordFallbackFailure,
  getStatus,
};
