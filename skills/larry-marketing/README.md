# 📱 TikTok App Marketing Skill（DHLinks 版）

> 用 AI 自动跑整套 TikTok + Instagram 轮播图文营销流水线：**生成 → 叠加 → 发布 → 跟踪 → 迭代。**

一个给 OpenClaw / AI Agent 的技能，把你的 App 营销变成数据驱动的机器。基于 Larry 方法论，曾做出 **700 万观看、100 万+ TikTok 观看、MRR $670/月** —— 全部由一个 AI Agent 完成。

**核心引擎是 DHLinks**：一次连接、一键发布到 22 个海外平台的白标 SaaS。本技能用 DHLinks 做发布与数据回看。

## 它能做什么

1. **调研竞品** — 浏览器分析你品类的赢家做法
2. **AI 生图** — 真实照片风轮播图（OpenAI / Stability / Replicate 或自带）
3. **叠加文字** — node-canvas，100+ 病毒帖磨出来的字号与定位
4. **一键发到多平台** — 走 DHLinks 后端（TikTok、Instagram、YouTube、LinkedIn、X、Threads、Pinterest、Reddit、Bluesky 等）
5. **回看数据** — 平台级统计 + 每条发布表现（DHLinks 后端）
6. **按数据迭代** — 每日反馈循环，告诉你什么有效、改什么
7. **可选：转化跟踪** — RevenueCat 集成，做完整漏斗情报（观看 → 下载 → 付费）

## 快速开始

### 前置条件

- **Node.js** v18+
- **node-canvas**（`npm install canvas`）— 叠加文字用
- **DHLinks 客户账号** — 在 `mcp/dhlinks-mcp/.env` 配 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`，并在账号里连好 TikTok/Instagram
- **生图 API**（三选一）：OpenAI、Stability AI、Replicate、或本地图片

### 安装

本技能随 DHLinks 安装包交付，无需联网下载。把它放进你的 agent skills 目录即可。

### 设置

1. **初始化工作目录：**
```bash
node scripts/onboarding.js --init --dir tiktok-marketing/
```

2. **填 `tiktok-marketing/config.json`：**
```json
{
  "app": {
    "name": "YourApp",
    "description": "What your app does",
    "audience": "Who it's for",
    "problem": "What pain it solves",
    "category": "home|beauty|fitness|productivity|food|other"
  },
  "imageGen": {
    "provider": "openai",
    "apiKey": "YOUR_OPENAI_KEY",
    "model": "gpt-image-1.5"
  },
  "dhlinks": {
    "platforms": ["tiktok", "instagram"]
  }
}
```
> ⚠️ DHLinks 凭证（用户名/密码）不写进配置文件，用环境变量 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD` 提供。

3. **校验配置：**
```bash
node scripts/onboarding.js --validate --config tiktok-marketing/config.json
```

### 制作第一条帖文

```bash
# 1. 生成 6 张轮播图
node scripts/generate-slides.js \
  --config tiktok-marketing/config.json \
  --output tiktok-marketing/posts/my-first-post/ \
  --prompts prompts.json

# 2. 叠加文字
node scripts/add-text-overlay.js \
  --input tiktok-marketing/posts/my-first-post/ \
  --texts texts.json

# 3. 发到 TikTok + Instagram（DHLinks）
node scripts/post-to-platforms.js \
  --config tiktok-marketing/config.json \
  --dir tiktok-marketing/posts/my-first-post/ \
  --caption "Your caption here #hashtag1 #hashtag2"

# 4. 回看数据
node scripts/check-analytics.js --config tiktok-marketing/config.json --days 3
```

## 反馈循环

这是技能真正奏效的原因。不只是「发了求好运」，而是数据驱动的优化引擎。

每天早上，日报：
1. 从 DHLinks 拉平台数据（粉丝、播放、触达）
2. 查发布历史（每条成功/失败、帖文 URL）
3. 若连了 RevenueCat：拉转化数据（试用、订阅、收入）
4. 套用诊断框架：

| 播放 | 转化 | 行动 |
|-------|-------------|--------|
| 🟢 高 | 🟢 高 | **放大** — 立刻做 3 个赢家钩子变体 |
| 🟢 高 | 🔴 低 | **修 CTA** — 钩子有效，下游断了 |
| 🔴 低 | 🟢 高 | **修钩子** — 内容会转化，需要更多曝光 |
| 🔴 低 | 🔴 低 | **彻底重启** — 换完全不同的打法 |

```bash
node scripts/daily-report.js --config tiktok-marketing/config.json --days 3
```

## 文件结构

```
tiktok-marketing-skill/
├── SKILL.md                    # 完整技能文档（给 AI Agent）
├── scripts/
│   ├── onboarding.js           # 配置校验 + 目录初始化
│   ├── generate-slides.js      # 生图（OpenAI/Stability/Replicate/local）
│   ├── add-text-overlay.js     # node-canvas 文字叠加
│   ├── post-to-platforms.js    # 经 DHLinks 后端一键多平台发布
│   ├── check-analytics.js      # DHLinks 数据 + 发布历史
│   ├── daily-report.js         # 带诊断的日报
│   └── competitor-research.js  # 竞品研究（占位）
└── references/
    ├── slide-structure.md      # 6 张公式 + 钩子写法
    ├── app-categories.md       # 品类专属模板
    ├── analytics-loop.md       # 数据接口参考（DHLinks）
    ├── competitor-research.md  # 研究方法
    └── revenuecat-integration.md # RevenueCat 设置
```

## 为什么发布走 DHLinks？

DHLinks 是多平台发布与数据回看的引擎：

- **一次调用 → 多平台** — TikTok、Instagram、YouTube、LinkedIn、X、Threads、Pinterest、Reddit、Bluesky
- **自动跟踪** — 每条发布拿到 `request_id`，无需手动关联帖文 ID
- **平台数据** — 粉丝、播放、触达、主页浏览 + 时间序列
- **发布历史** — 每条成功/失败、帖文 URL、平台专属 ID
- **自动鉴权** — 你的 DHLinks 客户账号（用户名 + 密码），无需 API Key

后端地址：https://api.dh-gos.online

## 已被验证的钩子公式

### 第一档：人物 + 冲突 → AI → 改主意（最好）
- "I showed my mum what AI thinks our kitchen should look like"（16.1 万观看）
- "My landlord said I can't change anything so I showed her this"（12.4 万观看）

### 第二档：接地气的预算痛点
- "POV: You have good taste but no budget"
- "I can't afford an interior designer so I tried AI"

完整的钩子写法指南见 `references/slide-structure.md`。

## 提示

- **永远竖屏（9:16）** — 铺满 TikTok 屏幕
- **加热门配乐** — TikTok 帖文会以草稿进收件箱，发布前加热门配乐
- **每天至少 3 条** — 一致性胜过偶发爆款
- **用 `gpt-image-1.5`**（如果用 OpenAI）— 永远不用 `gpt-image-1`（质量差距巨大）
- **全部跨平台** — 同一套内容、不同算法、更大覆盖面

## License

MIT

## Credits

Based on Larry's TikTok marketing methodology. 适配为 DHLinks 白标语境（发布与数据回看走 DHLinks 后端）。