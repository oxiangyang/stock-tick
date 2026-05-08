/**
 * 状态栏管理模块
 */

const vscode = require("vscode");
const {
  getMaxDisplayCount,
  getShowMiniName,
  getStockMiniNames,
  getShowChangeValue,
  getShowLockCount,
  getMiniMode,
} = require("../configs/vscodeConfig");
const { formatAmount } = require("../utils/stockUtils");
class StatusBarManager {
  constructor() {
    /** 每只股票独立的状态栏项 */
    this._stockItems = [];
    /** 用于显示"无股票/获取失败/隐藏"等状态的单一状态栏项 */
    this.statusBarItem = null;
    this._hidden = false;
  }

  /**
   * 初始化状态栏
   */
  initialize() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0,
    );
    this.statusBarItem.command = "stock-tick.manageStock";
    this.statusBarItem.show();
  }

  /**
   * 销毁所有独立股票状态栏项
   */
  _disposeStockItems() {
    for (const item of this._stockItems) {
      item.dispose();
    }
    this._stockItems = [];
  }
  /**
   * 渲染股票信息到状态栏
   * @param {string[]} stocks 股票代码列表
   * @param {object[]} stockInfos 股票数据列表
   */
  render(stocks, stockInfos) {
    this._hidden = false;

    // 无股票时的提示
    if (!stocks || stocks.length === 0) {
      this._disposeStockItems();
      if (!this.statusBarItem) return;
      this.statusBarItem.text = "$(add) 点击添加股票";
      this.statusBarItem.tooltip = "点击管理股票，开始您的看盘之旅";
      this.statusBarItem.show();
      return;
    }

    // 无有效数据时的处理
    if (!stockInfos || stockInfos.length === 0) {
      this._disposeStockItems();
      if (!this.statusBarItem) return;
      this.statusBarItem.text = "$(error) 股票获取失败";
      this.statusBarItem.tooltip = "请检查网络连接或股票代码是否正确";
      this.statusBarItem.show();
      return;
    }

    // 隐藏状态提示项，显示各股票独立项
    if (this.statusBarItem) {
      this.statusBarItem.hide();
    }

    this._renderStockItems(stocks, stockInfos);
  }

  /**
   * 每只股票独立一个状态栏项，悬停只显示该股详情
   */
  _renderStockItems(stocks, stockInfos) {
    const maxDisplayCount = getMaxDisplayCount();
    const miniMode = getMiniMode();
    const showMiniName = getShowMiniName();
    const stockMiniNames = getStockMiniNames();
    const showChangeValue = getShowChangeValue();
    const showLockCount = getShowLockCount();

    const displayStocks = stockInfos.slice(0, maxDisplayCount);

    // 计算本次需要的总项数（显示项 + 可能的省略项）
    const needExtra = stockInfos.length > maxDisplayCount;
    const totalNeeded = displayStocks.length + (needExtra ? 1 : 0);

    // 销毁多余的状态栏项
    while (this._stockItems.length > totalNeeded) {
      this._stockItems.pop().dispose();
    }

    displayStocks.forEach((stock, index) => {
      const change = parseFloat(stock.changeValue);
      const symbol = change >= 0 ? "↗" : "↘";
      const sign = change >= 0 ? "+" : "-";

      let text;
      if (miniMode) {
        // 极简模式：价格 ↗ +1.23%
        text = `${stock.current} ${symbol} ${sign}${Math.abs(parseFloat(stock.changePercent)).toFixed(2)}%`;
      } else {
        // 普通模式：名称/简称 价格 ↗+1.23%（可选涨跌值、封单）
        const displayName = showMiniName
          ? stockMiniNames[stock.code] ||
            (stock.name.length > 2 ? stock.name.substring(0, 2) : stock.name)
          : stock.name;
        text = `${displayName} ${stock.current} ${symbol}${stock.changePercent}%${showChangeValue ? `(${stock.changeValue})` : ""}`;
        if (
          showLockCount &&
          stock.lockAmount > 0 &&
          (stock.priceType === "up" || stock.priceType === "down")
        ) {
          text += ` 封${formatAmount(stock.lockAmount)}`;
        }
      }

      const tooltip = this._buildSingleStockTooltip(stock);

      if (index < this._stockItems.length) {
        // 复用已有项
        const item = this._stockItems[index];
        item.text = text;
        item.tooltip = tooltip;
        item.show();
      } else {
        // 新建状态栏项，优先级递减保证顺序
        const item = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          -index,
        );
        item.text = text;
        item.tooltip = tooltip;
        item.command = "stock-tick.manageStock";
        item.show();
        this._stockItems.push(item);
      }
    });

    // 省略提示项
    if (needExtra) {
      const remaining = stockInfos.length - maxDisplayCount;
      const extraText = `...(${remaining}+)`;
      const extraTooltip = `还有 ${remaining} 只股票未显示，点击查看全部`;

      if (this._stockItems.length > displayStocks.length) {
        const item = this._stockItems[displayStocks.length];
        item.text = extraText;
        item.tooltip = extraTooltip;
        item.show();
      } else {
        const item = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          -(displayStocks.length),
        );
        item.text = extraText;
        item.tooltip = extraTooltip;
        item.command = "stock-tick.manageStock";
        item.show();
        this._stockItems.push(item);
      }
    }
  }

  /**
   * 构建单只股票的 tooltip 卡片（MarkdownString）
   * 格式参考：标题行 + 核心行情 + 买卖盘 + 封单 + 时间
   */
  _buildSingleStockTooltip(stock) {
    const md = new vscode.MarkdownString("", true);
    md.isTrusted = true;
    md.supportThemeIcons = true;

    const change = parseFloat(stock.changeValue);
    const isUp = change >= 0;
    const sign = isUp ? "+" : "";

    // 标题
    md.appendMarkdown(`**【${stock.name}】今日行情**\n\n`);

    // 涨跌 + 百分比
    md.appendMarkdown(`涨跌：\`${sign}${stock.changeValue}\` &nbsp;&nbsp; 百分：\`${sign}${stock.changePercent}%\`\n\n`);

    // 现价 + 昨收
    if (stock.close !== undefined && stock.close !== null) {
      md.appendMarkdown(`现价：\`${stock.current}\` &nbsp;&nbsp; 昨收：\`${stock.close}\`\n\n`);
    } else {
      md.appendMarkdown(`现价：\`${stock.current}\`\n\n`);
    }

    // 买卖盘（有数据时显示）
    const hasBuySell =
      stock.buy1Price > 0 || stock.sell1Price > 0;
    if (hasBuySell) {
      const buy1 = stock.buy1Price > 0
        ? `${stock.buy1Price} × ${stock.buy1Volume}手`
        : "—";
      const sell1 = stock.sell1Price > 0
        ? `${stock.sell1Price} × ${stock.sell1Volume}手`
        : "—";
      md.appendMarkdown(`买一：\`${buy1}\` &nbsp;&nbsp; 卖一：\`${sell1}\`\n\n`);
    }

    // 封单（涨跌停时显示）
    if (stock.priceType === "up" || stock.priceType === "down") {
      const type = stock.priceType === "up" ? "涨停封单" : "跌停封单";
      md.appendMarkdown(`${type}：\`${formatAmount(stock.lockAmount)}\`\n\n`);
    }

    return md;
  }

  /**
   * 显示隐藏图标
   */
  setHidden() {
    if (this._hidden) return;
    this._hidden = true;

    for (const item of this._stockItems) {
      item.hide();
    }

    if (this.statusBarItem) {
      this.statusBarItem.text = "$(eye-closed)";
      this.statusBarItem.tooltip = "状态栏股票信息已隐藏\n点击后选择'显示状态栏'";
      this.statusBarItem.show();
    }
  }

  /**
   * 获取状态栏项（用于注册命令）
   */
  getStatusBarItem() {
    return this.statusBarItem;
  }

  /**
   * 销毁状态栏
   */
  dispose() {
    this._disposeStockItems();
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }
  }
}

module.exports = StatusBarManager;
