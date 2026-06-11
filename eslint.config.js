const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    // webview 脚本运行在浏览器中，且由多个片段在运行时拼接，
    // 引用了跨片段定义的 DOM 变量，单独静态检查无意义，排除之
    ignores: ["src/webview/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.js", "test/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "writable",
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        TextDecoder: "readonly",
        URL: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Date: "readonly",
        Math: "readonly",
        Object: "readonly",
        JSON: "readonly",
        parseFloat: "readonly",
        parseInt: "readonly",
        isNaN: "readonly",
        String: "readonly",
        Error: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
