# Viraloop 🔄

从任意网站自动生成病毒式 TikTok/Instagram 轮播图文，并用 **DHLinks** 一键发布。

> DHLinks 是一次连接、一键发布到 22 个海外平台的白标 SaaS。Viraloop 把它当作发布执行器：生成轮播 → 发布 → 回看数据 → 迭代。

## 理念：每日迭代

**每天发 1 张轮播。看数据。迭代。增长。**

```
Day 1:  发 → 看 → 学
Day 7:  7 个数据点，规律浮现
Day 30: 策略成型、获胜钩子、最优时段
```

技能在 `learnings.json` 里累积所有内容的洞察。

## 功能

- 🔍 **完整业务调研** - 从任意 URL 分析品牌、功能、竞品
- 🎨 **AI 生图** - 用 Gemini 生成 6 张视觉协调的轮播（免费层可用，无需信用卡）
- 📱 **直接发布** - 用 DHLinks 一键发布到 TikTok + Instagram，不用草稿、不用手点
- 💰 **零门槛起步** - Gemini 用免费层；发布走 DHLinks 客户账号（用户名 + 密码）
- 📊 **数据回看** - 通过 DHLinks 后端监控所有内容表现
- 🔄 **学习循环** - 累积最佳钩子、时段、日期、风格

## 快速开始

```bash
# 1. 分析网站
node scripts/analyze-web.js https://your-product.com

# 2. 生成轮播
GEMINI_API_KEY="..." bash scripts/generate-slides.sh

# 3. 发布（DHLinks）
DHLINKS_USERNAME="..." DHLINKS_PASSWORD="..." bash scripts/publish-carousel.sh

# 4. 回看数据
DHLINKS_USERNAME="..." DHLINKS_PASSWORD="..." bash scripts/check-analytics.sh 7
```

## 前置条件

- Node.js 18+
- Playwright（`npm install playwright && npx playwright install chromium`）
- uv（Python 包运行器）
- jq
- **DHLinks MCP**：在 `mcp/dhlinks-mcp/.env` 配置 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`，并在 DHLinks 账号里连接 TikTok / Instagram

## 环境变量

| 变量 | 说明 |
|----------|-------------|
| `DHLINKS_USERNAME` | DHLinks 客户账号用户名 |
| `DHLINKS_PASSWORD` | DHLinks 客户账号密码 |
| `GEMINI_API_KEY` | Google API Key，用于 Gemini 生图 |

## 轮播结构

1. **钩子** - 抓眼球的提问/痛点
2. **问题** - 放大痛点
3. **放大** - 展示竞品在跑、紧迫感
4. **方案** - 亮出产品
5. **卖点** - 核心利益点
6. **行动号召** - "Link in bio 👆"

## 凭证与安全

### 必需凭证（DHLinks）

| 凭证 | 类型 | 从哪拿 |
|------------|------|--------------|
| `DHLINKS_USERNAME` | 环境变量 | 你的 DHLinks 客户账号 |
| `DHLINKS_PASSWORD` | 环境变量 | 你的 DHLinks 客户账号 |

### 可选

| 凭证 | 类型 | 说明 |
|------------|------|-------------|
| `GEMINI_API_KEY` | 环境变量 | Google Studio 申请，仅用于生图 |

### 安全说明

- ✅ 所有凭证只从环境变量读取，不写进文件
- ✅ 脚本里不硬编码任何密钥
- ✅ 网站分析只读公开网页（不做鉴权抓取）
- ✅ 生成数据都留在本地 `/tmp/carousel/`

### 数据流

1. **网站 URL** → Playwright（本地浏览器）分析 → `analysis.json`
2. **分析结果** → 发给 Gemini → 返回生成图片
3. **图片 + 文案** → 发给 **DHLinks 后端** → 一键发布到 TikTok/Instagram
4. **数据** → 从 **DHLinks 后端** 读回 → 存进本地 `learnings.json`

### 用到的外部服务

| 服务 | 用途 | 发送的数据 |
|---------|---------|-----------|
| Gemini API | 生图 | 轮播的文字提示 |
| DHLinks（api.dh-gos.online） | 发布 + 回看数据 | 图片、文案 |

不传输任何敏感用户数据，只发送你要发布的内容。

## 为什么是 Viraloop？

| 特性 | Viraloop | 其它技能 |
|---------|----------|-------|
| 发布 | **直发 feed**（DHLinks 一键发布） | 仅草稿，需手动 |
| 音乐 | **自动流行音乐** | 手动加 |
| 平台 | **一个调用发 TikTok + Instagram** | 单平台手动跨发 |
| 调研 | **自动分析任意 URL** — 品牌/竞品/定价/功能 | 手动描述 |
| 图协调 | **图生图** — 第 2–6 张参考第 1 张 | 每张独立生成 |
| 生图 | **Gemini**（免费层） | 付费供应商 |
| 回看数据 | **DHLinks 后端** / dhlinks_analytics + dhlinks_history | 无 |
| 文案渲染 | **AI 原生** — 文字直接渲染进图 | 外部文字叠加脚本 |
| 提示词质量 | **结构化模板** — 明确字段保证一致 | 自由提示词 |
| 起步 | **3 个环境变量** 就开发 | 复杂多工具搭建 |

## 文档

完整说明见 [SKILL.md](./SKILL.md)。

## License

MIT