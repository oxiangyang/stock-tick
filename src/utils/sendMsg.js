/**
 * 统一消息发送模块
 * 支持限流、时间戳、消息类型等
 */

const vscode = require("vscode");

const COOLDOWN = 60000;

// 全局限流状态
let lastNotifyTime = 0;
let pendingMessages = [];

/**
 * 格式化当前时间 HH:MM:SS
 * @returns {string}
 */
function formatTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * 发送统一消息
 * @param {string} text - 消息内容
 * @param {Object} options - 配置项
 * @param {boolean} options.rateLimit - 是否限流，默认 false
 * @param {string} options.type - 消息类型: info | warning | error，默认 info
 * @param {boolean} options.showConfirm - 是否显示"知道了"按钮，默认 false
 * @param {number} options.autoHide - 自动消失毫秒数，设置后通知到时自动关闭（仅 info 且无按钮时生效）
 * @returns {void}
 */
function sendMsg(text, options = {}) {
  const {
    rateLimit = false,
    type = "info",
    showConfirm = false,
    autoHide,
  } = options;
  const buttons = showConfirm ? ["知道了"] : [];

  // 不限流直接发送
  if (!rateLimit) {
    showVscodeMessage(text, type, buttons, autoHide);
    return;
  }

  // 限流逻辑（全局）
  const now = Date.now();
  const canNotify = now - lastNotifyTime >= COOLDOWN;

  if (canNotify) {
    // 可以发送，带上之前被缓存的消息
    let finalText = text;
    if (pendingMessages.length > 0) {
      finalText = `${pendingMessages.join(" --- ")} --- [${formatTime()}] ${text}`;
      pendingMessages = [];
    }
    lastNotifyTime = now;
    showVscodeMessage(finalText, type, buttons, autoHide);
  } else {
    // 被限流，缓存消息等下次一起发
    pendingMessages.push(`[${formatTime()}] ${text}`);
  }
}

/**
 * 调用 vscode 消息 API
 * @param {string} msg - 消息文本
 * @param {string} type - 消息类型
 * @param {string[]} buttons - 按钮文本数组
 * @param {number} [autoHide] - 自动消失毫秒数（仅 info 且无按钮时生效）
 */
function showVscodeMessage(msg, type, buttons, autoHide) {
  // 自动消失的提示：用进度通知，到时 resolve 后通知自动关闭
  if (autoHide && type === "info" && buttons.length === 0) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: msg,
        cancellable: false,
      },
      () => new Promise((resolve) => setTimeout(resolve, autoHide)),
    );
    return;
  }

  switch (type) {
    case "warning":
      vscode.window.showWarningMessage(msg, ...buttons);
      break;
    case "error":
      vscode.window.showErrorMessage(msg, ...buttons);
      break;
    default:
      vscode.window.showInformationMessage(msg, ...buttons);
      break;
  }
}

module.exports = { sendMsg };
