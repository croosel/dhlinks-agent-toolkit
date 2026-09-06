---
name: dhlinks-viraloop
description: "DHLinks 竞品轮播图文营销循环。分析任意网站提取品牌/竞品/卖点，生成病毒式轮播图文，用 DHLinks 发布（dhlinks_publish，type=photos）到 TikTok/Instagram，再用 dhlinks_analytics / dhlinks_history 回看数据并反哺下一轮。当用户要求：做竞品轮播、生成图文轮播、循环发营销图、viraloop、竞品图文营销、自动发轮播并复盘等场景时触发。"
metadata:
  last-updated: "2026-09-06"
allowed-tools: Read, Write, Edit, Glob, Bash(node:*), Bash(python3:*), Bash(curl:*), DHLinks(dhlinks_publish, dhlinks_analytics, dhlinks_history)
version: "1.0.0"
license: MIT
compatibility: "已安装 DHLinks MCP（DHLINKS_USERNAME / DHLINKS_PASSWORD）。需要 Node.js 与 Python 3 in PATH，并配置 GEMINI_API_KEY 做图/做钩子。"
tags:
- carousels
- tiktok
- instagram
- growth
- automation
---

# Viraloop（DHLinks 版）

分析任意网站，为一款 TikTok/Instagram 生成 6 张视觉协调的轮播图文，**用 DHLinks 发布**到你的 feed，再读回数据分析哪类钩子有效，把结论喂进下一轮。循环就是重点：每天选择的钩子取决于昨天实际跑出来的表现，而非固定模板。

六个阶段：研究网站 → 生成钩子变体 → 渲染轮播 → 视觉审图 → **发布（dhlinks_publish）** → 从数字中学习。

## 前置条件

- Node.js 与 Python 3 in PATH
- `GEMINI_API_KEY`（研究、钩子、生图）
- **DHLinks MCP**：在 `mcp/dhlinks-mcp/.env` 配置 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`，并在 DHLinks 账号里连接 TikTok / Instagram
- AI 客户端里的 `dhlinks_*` 工具已自动带鉴权，无需 API Key

## 核心理念：每日迭代循环

增长的关键是**一致 + 学习**：

1. 每天发 1 张轮播 —— 一致性胜过爆发
2. 记录一切 —— 每条内容都是数据
3. 从数据里学 —— 哪种钩子有效？哪个时段？哪种视觉？
4. 迭代优化 —— 每条轮播都比上一条好

```
Day 1:  发 → 看 → 学
Day 7:  7 个数据点，规律浮现
Day 30: 策略成型、获胜钩子、最优时段
```

技能在 `learnings.json` 里累积所有内容的洞察。**这不是一次性的工具，而是增长引擎。**

## 快速开始

```bash
# 1. 完整业务调研
node {baseDir}/scripts/analyze-web.js https://your-website.com

# 2. 生成 3 个钩子变体（SHOCK / CURIOSITY / CONTRADICTION）
GEMINI_API_KEY="your-key" bash {baseDir}/scripts/generate-hooks.sh

# 3. 用视觉审钩子，选最好那个

# 4. 生成 6 张轮播图（用所选钩子类型）
GEMINI_API_KEY="your-key" bash {baseDir}/scripts/generate-slides.sh shock

# 5. AI 用视觉审图（文字可读、未被截断）

# 6. 用 DHLinks 发布到 TikTok + Instagram
#    推荐：AI 客户端内调 dhlinks_publish（type=photos, platforms=["tiktok","instagram"]）
#    或脚本：bash {baseDir}/scripts/publish-carousel.sh
#    或 curl：见下方发布小节

# 7. 回看数据（24-48h 后）
bash {baseDir}/scripts/check-analytics.sh 7
#    或 AI 客户端内调 dhlinks_analytics / dhlinks_history

# 8. 学习数据，用于下一张轮播
node {baseDir}/scripts/learn-from-analytics.js
```

## 指令（流程）

1. 用 `analyze-web.js` 调研网站，提取业务、受众与切入角度。
2. 生成三套钩子变体（SHOCK / CURIOSITY / CONTRADICTION）并审一遍。
3. 选定钩子类型，据此生成 6 张轮播图。
4. 用视觉审图：确认文字可读、未被截断，再发布——坏图比没发更糟。
5. **发布到 TikTok + Instagram**：推荐用 `dhlinks_publish`（type=photos）。
6. 一天后读数据分析，跑学习步骤，让下一批有依据。

## 钩子分类（视觉新颖系统）

打破 1000 播放天花板的关键是**首图的视觉新颖性**。我们生成 3 种钩子：

| 类型 | 目标 | 视觉风格 |
|------|------|----------|
| **SHOCK** | 用不可能/荒诞的视觉喊停滑屏 | 超现实、混乱、"这啥？" |
| **CURIOSITY** | 制造信息缺口 | 神秘、秘密揭露 |
| **CONTRADICTION** | 展示不可能的搭配 | 放松 + 高强度，"怎么可能的？" |

所有钩子带防素材库提示，避免：通用图库审美、惊呆美少女套路、刻板网红姿势、烂大街的电脑咖啡构图、公司握手场景。

## 生图模型

用 **gemini-3.1-flash-image-preview** 生成轮播：`scripts/generate_image.py` 支持图生图，保证 6 张之间的视觉协调。

## Step 1: 完整调研（analyze-web.js）

读取任意网站的：品牌信息（名称/Logo/CSS 色/字体）、内容（标题/卖点/功能/定价/证言/数据/CTA/Meta 标签）、内部页、竞品线索（站点内出现的 "vs/alternative/compare"）、讲故事的素材（业务类型/利基/痛点/卖点叙事）、视觉上下文（配色/字体/风格指南）。输出 `/tmp/carousel/analysis.json`。

## Step 2: 生成轮播图（generate-slides.sh）

生成 6 张视觉协调的轮播：

| 轮播 | 类型 | 内容 |
|------|------|------|
| 1 | **HOOK** | 提问/问题作钩子。确立全部视觉风格。 |
| 2 | **Problem** | 放大痛点。 |
| 3 | **Agitation** | 竞品在跑、紧迫感。 |
| 4 | **Solution** | 亮出产品与价值主张。 |
| 5 | **Feature** | 核心卖点。 |
| 6 | **CTA** | "Link in bio 👆" + 行动号召。 |

第 1 张定基准风格（配色/字体/氛围），2–6 张以第 1 张为参考做图生图，保持同一套视觉。

输出：`/tmp/carousel/slide-{1-6}.jpg` + `caption.txt`。

## Step 3: 视觉审图

生成后，Agent **必须**逐张审：文字可读、没有字被切、拼写正确、6 张视觉协调、画质可接受。有问题就重生特定那张。

## 图片格式

- 分辨率 768x1376（9:16 竖屏）
- JPG（TikTok 不收 PNG）
- 文字大、粗、带阴影保证可读
- 背景贴合业务场景，不要纯色

## Step 4: 发布到 TikTok + Instagram

**方式 A（推荐）：AI 客户端内调 `dhlinks_publish` 工具**

```
dhlinks_publish {
  "platforms": ["tiktok", "instagram"],
  "type": "photos",
  "title": "<caption>",
  "mediaBase64": ["<slide1>", "<slide2>", ...],   // 六张图的 base64；或用 mediaUrl
  "mode": "now"
}
```

**方式 B：脚本直连 DHLinks 后端**

```bash
bash {baseDir}/scripts/publish-carousel.sh
```

脚本先 `POST https://api.dh-gos.online/api/login`（`DHLINKS_USERNAME` / `DHLINKS_PASSWORD`）拿 token，再 `POST /api/publish`（type=photos，mediaBase64 数组）发布。

**手动 curl 示例：**

```bash
# 1. 登录拿 token
TOKEN=$(curl -s -X POST https://api.dh-gos.online/api/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$DHLINKS_USERNAME\",\"password\":\"$DHLINKS_PASSWORD\"}" | jq -r .token)

# 2. 发布（photos 类型）
curl -s -X POST https://api.dh-gos.online/api/publish \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "platforms": ["tiktok", "instagram"],
    "type": "photos",
    "title": "轮播文案",
    "mediaBase64": ["<slide1…6 的 base64>"],
    "mode": "now"
  }'
```

**⚠️ Instagram 注意**：发布后通常需要到 Instagram app 里给帖子手动加流行音乐：`个人主页 → 那条帖子 → 编辑 → 添加音乐 → 搜热门曲目`。

## Step 5: 回看数据（check-analytics.sh）

```bash
bash {baseDir}/scripts/check-analytics.sh 7
```

脚本用 DHLinks 后端 `GET /api/analytics`（平台级：粉丝/互动/播放）与 `GET /api/history`（按 post 回看帖子 URL 与状态）。**更推荐**：在 AI 客户端内直接调 `dhlinks_analytics`（platforms 数组，缺省全部）和 `dhlinks_history`。

## Step 6: 学习与改进（learn-from-analytics.js）

```bash
node {baseDir}/scripts/learn-from-analytics.js
```

分析数据、保存到 `learnings.json`：最佳钩子（播放最高）、最优发帖时段、下一张轮播的建议。

## 完整流程

```bash
# 1. 调研业务
node {baseDir}/scripts/analyze-web.js https://my-product.com
# 2. 生成轮播
GEMINI_API_KEY="..." bash {baseDir}/scripts/generate-slides.sh
# 3. 视觉审图（AI 逐张核对）
# 4. 发布（推荐 dhlinks_publish；或脚本 publish-carousel.sh）
# 5.（数小时到一天后）回看数据（推荐 dhlinks_analytics / dhlinks_history；或 check-analytics.sh）
# 6. 学习，用于下一条
node {baseDir}/scripts/learn-from-analytics.js
```

## 输出

每次运行产出 6 张轮播图 + 元数据文件，发布步骤返回每个平台的结果：

```
Carousel published
  tiktok     ✅  https://tiktok.com/@brand/photo/7412...
  instagram  ✅  https://instagram.com/p/C8xY2...
```

回看步骤返回每张轮播的播放/点赞/收藏，学习步骤据此给钩子类型排名。汇报哪个钩子类型获胜——那才是能复利的产出。

## 安全

- **发布默认私有**。`publish-carousel.sh` 只有在同时设置 `PRIVACY_LEVEL=PUBLIC_TO_EVERYONE` 和 `CONFIRM_PUBLIC=yes` 时才公开发布。
- **文案绝不交给 shell 求值**。文案来自任意分析的网站，属不可信输入；请求用 curl 参数数组而非 shell 字符串构造。
- **凭证绝不打印**。脚本以 `[set]` 汇报，从不显示任何 token 值——这些脚本在 cron 下运行，输出进日志。
- 环境文件可用 `VIRALOOP_ENV_FILE` 指向自己的 env 文件。

## 常见报错

- **Gemini 额度耗尽** — 免费层有每分钟和每日限制。退避重试，不要中途降级到更差的模型。
- **轮播文字被截/不可读** — 在视觉审图那步就发现。重建那张，不要发布。
- **发布后某平台失败** — DHLinks 侧先确认对应平台已连接并已授权。
- **`check-analytics.sh` 报 401 / 无 token** — 检查 `.env` 里 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`。
- **Instagram 拒绝轮播** — 账号必须是企业号/创作者号且绑定了 Facebook Page；个人号无法通过 API 发布。

## 经典示例

**对某个网站跑完整每日流程**

```bash
node scripts/analyze-web.js https://example.com
GEMINI_API_KEY="..." bash scripts/generate-hooks.sh
GEMINI_API_KEY="..." bash scripts/generate-slides.sh curiosity
bash scripts/publish-carousel.sh     # 或 dhlinks_publish(type=photos)
```

**回看昨天的数字并学习**

```bash
bash scripts/check-analytics.sh       # 或 dhlinks_analytics / dhlinks_history
node scripts/learn-from-analytics.js
```

## 文件

```
{baseDir}/
├── SKILL.md                  # 本文档
└── scripts/
    ├── analyze-web.js        # 完整业务调研
    ├── generate-slides.sh    # 生成 6 张协调轮播
    ├── generate_image.py     # Gemini 3.1 flash 生图
    ├── review-slides.js      # 准备轮播供视觉审图
    ├── publish-carousel.sh   # 发布（调用 DHLinks 后端）
    ├── check-analytics.sh    # 回看数据（DHLinks）
    ├── learn-from-analytics.js
    └── search-competitors.js # 可选外部搜索
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `DHLINKS_USERNAME` | DHLinks 客户账号用户名 |
| `DHLINKS_PASSWORD` | DHLinks 客户账号密码 |
| `GEMINI_API_KEY` | Google API Key，用于生图 |

## 各利基钩子示例

| 利基 | 钩子示例 |
|------|----------|
| 社媒工具 | "还在一个一个平台地发帖子？😩" |
| SaaS 通用 | "还在手动干这个？" |
| 电商 | "TikTok 停不下来的那个产品" |
| App | "我真希望早发现的 App" |
| 开发者工具 | "会改变你代码的那个 API" |

## 为什么是 Viraloop？

| | Viraloop | 其它技能 |
|-|----------|-------|
| 发布 | 直发 feed（DHLinks） | 仅草稿 |
| 音乐 | 可自动加流行音乐 | 手动 |
| 平台 | TikTok + Instagram | 单平台 |
| 调研 | 自动 URL 分析 | 手动描述 |
| 图协调 | 图生图参考 | 独立图 |
| 生图 | Gemini（免费层） | 付费 |
| 数据回看 | dhlinks_analytics / dhlinks_history | 无 |

## 备注

- 分析从网站内容本身提取竞品（内置 20+ 已知 SaaS 名单）
- 图生图保持协调但每张约 20 秒
- 生成的文案含利基相关标签
- 始终审图——文字有时会被切
- TikTok 上 `auto_add_music` 能提升互动
- 24–48h 后再回看才有意义的数据
- 学习洞察随每条已发布轮播累积
- TikTok title 上限 90 字符（含标签自动截断）