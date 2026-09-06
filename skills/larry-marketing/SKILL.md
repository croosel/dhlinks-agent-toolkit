---
name: dhlinks-tiktok-app-marketing
description: "用 AI 自动化 TikTok + Instagram 轮播图文营销（Larry 方法论）。调研竞品 → 生成图文 → 加文案叠加 → 用 DHLinks 一键发布 → 回看数据 → 迭代。当用户要求：为 App/产品做 TikTok 营销、生成轮播图帖、分析帖文表现、优化营销漏斗、做 slideshow ads、社媒营销自动化、hook 测试、RevenueCat 转化跟踪时触发。"
allowed-tools: Read, Write, Edit, Glob, Bash(node:*), Bash(curl:*), DHLinks(dhlinks_publish, dhlinks_analytics, dhlinks_history, dhlinks_account)
version: "1.0.0"
license: MIT
compatibility: "需要 Node.js on PATH + GEMINI_API_KEY/生图 Key + DHLinks 客户账号（已装 DHLinks MCP，DHLINKS_USERNAME / DHLINKS_PASSWORD）。scripts/ 做生图、叠加、发布与回看数据。"
tags:
- marketing
- tiktok
- instagram
- slideshows
- growth
---

# TikTok App Marketing（DHLinks 版）

自动跑整套 TikTok 轮播图文营销流水线：生成 → 叠加 → 发布 → 跟踪 → 迭代。

**已验证成绩：** 病毒级 X 文章 700 万观看、TikTok 100 万+ 观看、MRR $670/月 —— 全部来自跑在旧游戏 PC 上的 AI Agent。

## 概览

面向 App 或产品在 TikTok / Instagram 上的闭环营销流水线，基于 Larry 方法论：
研究竞品在该品类里已跑通的东西 → 生成轮播图 → 叠加钩子文案 → 发到两个平台 → 读数字 → 让数据决定下一批钩子。

**循环即产品。** 生成轮播是容易的一半；准确衡量哪个钩子带来了安装、并把结论喂回去，才让它复利。

## 前置条件

本技能不捆绑任何依赖。你的 AI Agent 需要根据你的环境去研究和安装。告诉你的 Agent 你在用什么，它自己会搞定。

### 必需
- **Node.js**（v18+）—— 所有脚本跑在 Node 上。你的 Agent 应验证是否已装，没有就装。
- **node-canvas**（`npm install canvas`）—— 用于给轮播图叠加文字。这是原生模块，部分系统可能要 build 工具（Python、make、C++ 编译器）。让 Agent 按你的系统查安装要求。
- **DHLinks** —— 整个系统的心脏。DHLinks 用一次调用同时发到 TikTok、Instagram 及其它已授权平台，并提供**数据回看**（粉丝、播放、触达）与**发布历史**（按条跟踪 request_id）——这支撑了日常反馈循环。没有 DHLinks 就没有发布和数据跟踪，而反馈循环才是让账号真正增长、而非盲发的关键。

  > 登录：在 AI 客户端配置 `mcp/dhlinks-mcp/.env` 的 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`，`dhlinks_*` 工具已自动带鉴权，**不需要任何 API Key**。发布/查询动作走 `https://api.dh-gos.online`。

### 生图（三选一）
你选择谁来生图。你的 Agent 应去查你选的供应商的 API 文档：
- **OpenAI** — `gpt-image-1.5`（**永远 1.5，不要 1**）。需要 OpenAI Key。最适合真实照片风。这是 Larry 用的、也是强推的。
- **Stability AI** — Stable Diffusion XL 及更新。适合风格化/艺术图。
- **Replicate** — 跑任意开源模型（Flux、SDXL 等）。最灵活。
- **本地** — 自带图片。无需 API。把图放进输出目录，脚本会自动跳过生成。

### 转化跟踪（可选但强烈推荐给移动 App）
- **RevenueCat** — 让情报环完整。DHLinks 告诉你哪些帖文有播放；RevenueCat 告诉你哪些帖文带来**付费用户**。两者结合，Agent 能区分「病毒但不赚钱」的帖子和「低调但真的转化」的帖子，并据此优化。可安装 RevenueCat skill（`clawhub install revenuecat`）拿订阅/MRR/试用/流失/收入的完整 API。也有 **RevenueCat MCP** 供 Agent 程序化控制产品与方案。

### 跨平台（DHLinks 内置）
DHLinks 支持一个调用同时发到 TikTok、Instagram、YouTube、LinkedIn、Facebook、X、Threads、Pinterest、Reddit、Bluesky。你的 Agent 应研究哪些平台适合你的受众，并在 DHLinks 账号里连好它们。同一套内容、不同算法、更多触达。

## 首次运行 — Onboarding

首次运行收集流水线需要的 App 信息：名称、品类、受众、价值主张、要研究的竞品、以及用来归因安装的 RevenueCat 或分析对接。

跑 onboarding 脚本并回答提示：
```bash
node scripts/onboarding.js
```
它把答案写进技能配置并校验 `GEMINI_API_KEY` 与 DHLinks 凭证是否就绪。缺必填值就问用户，不要臆造默认值。

完整引导（每个提示 + 品类专属指导）见 [references/onboarding.md](references/onboarding.md)。

## 指令

1. **Onboard 一次** — 记录 App、品类、受众与竞品。
2. **研究竞品** 找品类里已经在跑的钩子。
3. **生成轮播图** 用 `scripts/generate-slides.js`。
4. **叠加钩子文案** 用 `scripts/add-text-overlay.js`。
5. **发到 TikTok 和 Instagram** 用 `scripts/post-to-platforms.js`。TikTok 轮播默认以草稿形式发出 —— 见下方工作流说明。
6. **回看数据** 用 `scripts/check-analytics.js` 并产出日报。
7. **把数字喂回** 下一批的钩子选择。这步永远不能跳。

## 核心工作流

### 1. 生成轮播图

用 `scripts/generate-slides.js`：
```bash
node scripts/generate-slides.js --config tiktok-marketing/config.json --output tiktok-marketing/posts/YYYY-MM-DD-HHmm/ --prompts prompts.json
```
脚本按 `config.imageGen.provider` 自动路由到对应供应商。支持 OpenAI、Stability AI、Replicate 或本地图片。

**⚠️ 超时警告：** 生成 6 张图共需 3–9 分钟（gpt-image-1.5 每张 30–90 秒）。把 exec timeout 至少设成 **600 秒（10 分钟）**。若报 `spawnSync ETIMEDOUT`，就是 exec timeout 太短。脚本支持断点续跑 —— 中途失败再跑一次，已完成的分片会跳过。

**图片硬性规则（所有供应商）：**
- 永远竖屏（1024×1536 或 9:16 等同）— 铺满 TikTok 屏幕
- 提示词里带 "iPhone photo" 和 "realistic lighting"（AI 供应商）
- 全部 6 张共享**完全相同的基底描述**（只有风格/功能不同）
- 跨图锁定关键元素（架构、脸型、机位）
- 6 张公式见 [references/slide-structure.md](references/slide-structure.md)

### 2. 叠加文字

这步用 `node-canvas` 把文字直接渲染到图上。Larry 制作播放量破百万的 TikTok 轮播，靠的就是几百次发帖磨出来的字号/位置/样式。

#### 安装 node-canvas

叠加文字前，你的用户要先装 `node-canvas`。提示他：
> "要给轮播加文字，我需要一个叫 node-canvas 的库。它把文字直接渲染到图上，字号、位置、样式都能完全控制——Larry 的病毒 TikTok 轮播就是这么做的。
>
> 你可以在终端跑这条命令吗？"
> ```bash
> npm install canvas
> ```
> "如果失败，是因为 node-canvas 需要一些系统库。先装这些："
>
> **macOS:**
> ```bash
> brew install pkg-config cairo pango libpng jpeg giflib librsvg
> npm install canvas
> ```
> **Ubuntu/Debian:**
> ```bash
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
> npm install canvas
> ```
> "装好后其它交给我——生成叠加、缩放文字、完美定位。你之后就不用再碰了。"

**别跳过这步。** 没有 node-canvas，文字叠加就不工作。若安装失败，帮他排障——通常是缺系统库。装一次就一直在。

#### 文字叠加步骤

1. **把原图载入** node-canvas
2. **按键数配置字体** 大小
3. **画文字** 白字 + 粗黑描边
4. **审图** — 核对字号、位置、可读性
5. **调整重渲染** 若有不妥
6. **存最终图** 满意为止

**关键细节（Larry 的专业感来源）：**
- **动态字号** — 短文案更大（75px），长文案更小（51px）。每张都优化。
- **自动换行** — 尊重手动 `\n`，但也自动把超过 75% 宽度的行折行。不压扁。
- **距顶 28% 居中** — 文字块围绕该点垂直居中，不钉死。
- **粗描边** — 字号 15%。任何背景上都可读。
- **优先手动换行** — 用 `\n` 控制节奏。每行 4–6 词。

**文字内容规则：**
- **写「反应」不是「标签」** — "Wait... this is actually nice??" 而不是 "Modern minimalist"
- **每行 4–6 词** — 短行一眼扫完
- **每张 3–4 行最理想**
- **不要 emoji** — canvas 无法稳定渲染
- **安全区：** 底部 20%（TikTok 控件）和顶部 10%（状态栏）不放文字

**⚠️ 换行极其关键 —— 必读：**

`texts.json` 里的文字必须带 `\n` 换行来控制行断在哪。传一个不带换行的长字符串会自动折行，但**手动断行的观感好得多**，因为节奏由你掌控。

**好的（手动断行，每行 4–6 词）：**
```json
[
  "I showed my landlord\nwhat AI thinks our\nkitchen should look like",
  "She said you can't\nchange anything\nchallenge accepted",
  "So I downloaded\nthis app and\ntook one photo",
  "Wait... is this\nactually the same\nkitchen??",
  "Okay I'm literally\nobsessed with\nthis one",
  "Snugly showed me\nwhat's possible\nlink in bio"
]
```

**坏的（无断行 — 会自动折行但观感差）：**
```json
[
  "I showed my landlord what AI thinks our kitchen should look like",
  ...
]
```

**写叠加文字的规则：**
1. **每行最多 4–6 词** — 短行一眼扫完
2. **用 `\n` 断行** — 掌控节奏
3. **每张 3–4 行最理想** — 再多也不溢出
4. **读出声** — 每行应像一次自然的停顿
5. **不要 emoji** — canvas 渲染不了，会显示为空白
6. **REACTIONS not labels** — "Wait... this is nice??" 不是 "Modern minimalist"

脚本会把超过 75% 宽度的行作为安全网自动折行，但永远优先手动 `\n` 以获得最佳视觉效果。

### 3. 发到 TikTok + Instagram

用 `scripts/post-to-platforms.js`：
```bash
node scripts/post-to-platforms.js --config tiktok-marketing/config.json --dir tiktok-marketing/posts/YYYY-MM-DD-HHmm/ --caption "caption" --title "title"
```

它把全部轮播图作为照片轮播，用一次 DHLinks 调用同时发到 TikTok + Instagram（及配置里其它平台）。

**工作方式：**
1. 从目录读轮播图（slide1 到 slideN）
2. 先登录 DHLinks 后端拿 token
3. 把图 base64 编码后 `POST /api/publish`（type=photos）
4. 把所有配置平台放进同一个请求
5. 返回 `request_id` 用于跟踪（存进 `meta.json`）

**无需手动关联网页视频 ID。** DHLinks 按 `request_id` 自动跟踪帖文，历史接口回传各平台帖文 URL 与成功/失败状态。

**文案规则：** 长的讲故事文案（3 倍观看）。结构：钩子 → 痛点 → 发现 → 它做什么 → 结果 → 最多 5 个话题标签。对话口吻。

### 为什么 TikTok 轮播以草稿发出 —— 最佳实践

对 TikTok 来说，帖文以照片轮播发布。TikTok 照片帖从热门配乐受益巨大：

1. **音乐在 TikTok 上就是一切。** 热门配乐大幅提升触达。算法偏爱用热门音频的帖文。
2. **发帖后从 TikTok 音乐库加配乐** — 浏览你品类的热门配乐。
3. **没配乐的帖文会被埋掉。** 无声轮播像广告，会被划走。热门配乐让内容看起来更原生。

这是我们做到 100 万+ TikTok 观看和 $670/月 MRR 的工作流。不要跳过配乐这步。

**Instagram 轮播不需要配乐** — 原样就很好。DHLinks 对两个平台用合适的设置。

### 4. 回看数据

用 `scripts/check-analytics.js` 拉平台数据与发布历史：
```bash
node scripts/check-analytics.js --config tiktok-marketing/config.json --days 3
```

脚本会：
1. 拉平台级数据（粉丝、播放、触达、主页浏览）
2. 拉最近 N 天的发布历史
3. 按 `request_id` 分组（一次发布 = 多平台条目）
4. 展示每条的成功/失败状态与帖文 URL
5. 存快照到 `analytics-snapshot.json`

**无需任何连接步骤。** 不像别的系统要手动关联帖文 ID，DHLinks 自动按 `request_id` 跟踪。一上传，历史里立刻出现哪些平台收到帖文及其 URL。

**更推荐在 AI 客户端里**直接调 `dhlinks_analytics`（platforms 数组）与 `dhlinks_history`。

**日常 cron 自动跑一遍。** 早上运行，查最近 3 天，生成完整日报。

---

## 反馈循环（关键 —— 这是它奏效的原因）

这是把流水线和"轮播生成器"区分开的部分。每条帖文被度量，下一批按实际表现选，而不是固定模板。

关键规则：
- **读上一批数字之前，绝不发新一批。** 盲发会让循环变成噪音。
- **一次只改一个变量** — 钩子或 CTA，不是都改 — 否则无法归因。
- **快速砍失败者，缓慢放大赢家。** 一个钩子连续两次不行就死；赢一次还不算被证明。
- **归因到安装，不是点赞。** 有播放没安装 = 钩子有效、产品没接住。

完整机制、阈值和分析查询见 [references/feedback-loop.md](references/feedback-loop.md) 与 [references/analytics-loop.md](references/analytics-loop.md)。

## 发帖时段

最优时段（按受众时区调整）：
- **7:30** — 早起刷屏高峰
- **16:30** — 午后休息
- **21:00** — 睡前沿高

每天至少 3 条。一致性胜过偶发爆款。100 条稳赢 1 条。

## 跨平台

DHLinks 支持一次调用把同一内容发到 10+ 平台。建议：
- **Instagram** — 尤其适合美妆/生活方式/家居（默认包含）
- **YouTube Shorts** — 长尾发现
- **Threads** — 轻量互动
- **LinkedIn** — 做 B2B/专业 App
- **Pinterest** — 视觉/家居/设计品类很强

同一套图、不同算法、更大覆盖面。各平台算法独立评估内容。DHLinks 自动处理各平台格式要求。

## App 品类模板

品类专属的轮播提示词与钩子公式见 [references/app-categories.md](references/app-categories.md)。

## 输出

每批产出渲染好的图、各平台帖文 URL、以及把钩子与结果挂钩的日报：

```
Batch 2026-08-29 — hook type: CONTRADICTION

  tiktok     ✅  draft created (publish from the app)
  instagram  ✅  https://instagram.com/p/C8xY2...

Yesterday's batch (CURIOSITY):
  views 12,401 · saves 388 · installs 47 · CPI-equivalent €0.00
  → CONTRADICTION selected for today
```

始终同报安装与观看。有观看没安装 = 钩子有效但产品没接住；这个区分驱动下一个决策。

## 报错处理

- **Gemini 限流/配额** — 免费层按分钟和按天都限。退避重试，不要中途静默降级到更差的模型。
- **文字叠加被截/不可读** — 重新生成那张。坏图发布比拖一批更糟。
- **DHLinks `401`** — token 过期或凭证错。确认 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD` 正确，重新登录。
- **Instagram 拒绝帖文** — 账号必须是企业号/创作者号且绑了 Facebook Page；个人号没法通过 API 发布。
- **TikTok 轮播以草稿出现** — 这是设计好的，不是失败。见工作流里的最佳实践说明：在 App 内发布触达更好。
- **发完数据是空的** — 平台指标滞后数小时。不要把第一次空读数当零表现；等下一轮。

## 示例

**完整一天一批**
```bash
node scripts/competitor-research.js
node scripts/generate-slides.js
node scripts/add-text-overlay.js
node scripts/post-to-platforms.js
```

**选今天的钩子前先读昨天的数字**
```bash
node scripts/check-analytics.js
node scripts/daily-report.js
```

## 常见错误

| 错误 | 修正 |
|---------|-----|
| 1536x1024（横屏） | 用 1024x1536（竖屏）|
| 字号 5% | 用宽度 6.5% |
| 文字在底部 | 定位从顶部 30% |
| 每张图房间不一样 | 在每条提示词里锁定架构 |
| 标签不是反应 | "Wait this is nice??" 不是 "Modern style" |
| 只跟踪播放 | 跟踪转化 —— 没收入的播放是虚荣指标 |
| 钩子一成不变 | 按数据迭代，每周试新格式 |
| 不跨平台 | 用 DHLinks 一次发到所有平台 |
| `spawnSync ETIMEDOUT` | exec timeout 太短 —— 6 张图生图要 3-9 分钟。用 10 分钟超时或逐张生成 |

## 资源

- Onboarding 引导： [references/onboarding.md](references/onboarding.md)
- 反馈循环机制： [references/feedback-loop.md](references/feedback-loop.md)
- 数据循环： [references/analytics-loop.md](references/analytics-loop.md)
- 竞品研究方法： [references/competitor-research.md](references/competitor-research.md)
- 轮播结构： [references/slide-structure.md](references/slide-structure.md)
- App 品类模板： [references/app-categories.md](references/app-categories.md)
- RevenueCat 集成： [references/revenuecat-integration.md](references/revenuecat-integration.md)
- DHLinks 发布与回看接口： https://api.dh-gos.online

## 安全

- **`post-to-platforms.js` 需要 `--confirm-public`**（或 `LARRY_CONFIRM_PUBLIC=yes`）才发布。它发到线上 feed，批准在代码里强制，而不是靠工作流约定。
- 请求用 `fetch` 与 JSON 构造；流水线全程不碰 shell，文案和钩子无法注入命令。
- DHLinks 凭证（用户名/密码）走环境变量或 `mcp/dhlinks-mcp/.env`，不写进配置文件；脚本永不打印 token。