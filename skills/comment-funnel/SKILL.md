---
name: dhlinks-comment-funnel
description: "DHLinks 评论→私信转化漏斗。通过 DHLinks 的 Instagram 工具读取帖子评论、按关键词语义筛选、再用私信工具自动回复评论作者（DM 漏斗 / 私信回复）。当用户要求：评论私信、评论转化、DM 漏斗、自动回复评论留言、把评论过关键词的人加私信、抓取某帖子评论并私信、设置评论自动引流等场景时触发。仅针对 Instagram。"
version: "1.0.0"
metadata:
  last-updated: "2026-09-06"
allowed-tools: "DHLinks MCP 工具（dhlinks_instagram、dhlinks_send_dm），阅读/写入本地记录文件"
license: MIT
compatibility: "需要已安装 DHLinks MCP，并在 mcp/dhlinks-mcp/.env 配置 DHLINKS_USERNAME / DHLINKS_PASSWORD。仅支持 Instagram——评论→私信能力只在 Instagram 上提供。"
tags:
- instagram
- dm-automation
- lead-generation
- funnels
- social-media
---

# 评论→私信转化漏斗（DHLinks）

把 Instagram 帖子评论变成一对一的私信对话：读取帖子的评论，按触发关键词（语义判断，不只是精确匹配）筛选出有需求的评论者，然后给每位评论者发送一条个性化的私信，并记录「已回复」避免重复打扰。

这是 ManyChat 等主流私信自动化的同一套机制——Meta 官方 Private Replies API，合规于 Meta 的条款。

## 概述

漏斗有三个环节：**监控**（读取一个帖子下的评论）、**触发**（判断评论文本是否命中意图/关键词）、**私信模板**（为每位评论者个性化定制）。如果对方在私信里回复，按 Meta 的 24 小时窗口规则，对话会保持打开，可以继续跟进。

## 前置条件

- 已安装 **DHLinks MCP**，并在 `mcp/dhlinks-mcp/.env` 配置了客户账号：
  ```env
  DHLINKS_USERNAME=客户账号用户名
  DHLINKS_PASSWORD=客户账号密码
  ```
- 客户在 DHLinks 账号里已连接 **Instagram 企业号或创作者账号**（个人号拿不到 Meta 的 Private Replies 权限）。
- 准备要监控的 **帖子 ID 或帖子 URL**。
- AI 客户端里的 `dhlinks_*` 工具已自动携带鉴权，**无需任何 API Key**。

## 鉴权说明

`dhlinks_instagram`、`dhlinks_send_dm` 等工具在 AI 客户端已配置好 DHLinks 鉴权，直接调用即可，不需要手写 API Key 或 token。所有发布/查询动作都通过 **DHLinks 的 dhlinks MCP 工具**完成（后端地址 https://api.dh-gos.online）。

## 工作流程

### Step 1 — 读取评论

调用 `dhlinks_instagram`，参数 `scope=comments`，并传入 `postId` 或 `postUrl`：

```
dhlinks_instagram {
  "scope": "comments",
  "postId": "帖子ID"          # 或 postUrl: "https://www.instagram.com/p/ABC123/"
}
```

返回该帖子的评论列表，每条包含 `commentId`、`text`、`username`、`timestamp` 等字段。

**速率注意**：评论读取通常建议按帖限频调用（不要在一个死循环里高频轮询）。如果拿不到目标帖子，可以先 `scope=media` 列出最近帖子定位。

### Step 2 — 筛选含关键词的评论

遍历评论，用**语义判断**（而不是单纯字符串相等）判断是否命中触发意图。下面是「触发词 = GUIDE」的例子：

| 评论 | 命中？ |
|------|--------|
| "GUIDE" | 精确命中 |
| "guide please" | 包含关键词 |
| "I want the guide" | 语义意图 |
| "can you send me the guide?" | 语义意图 |
| "guía" | 翻译命中 |
| "great post!" | 无意图 → 不私信 |
| "nice guide on the topic" | 在谈论内容，非索取 → 不私信 |

关键判断：**这个人是不是在索取你帖子里提供的东西？** 用判断力，别只靠正则。

### Step 3 — 私信回复评论作者

对每一条命中且**尚未回复过**的评论，调用 `dhlinks_send_dm`，使用 **commentId 模式**（私信回复该评论作者）：

```
dhlinks_send_dm {
  "commentId": "评论ID",
  "message": "你好@用户名！你提到的资料在这里：https://example.com/guide，有问题随时问我！"
}
```

**个性化建议**：不要给对方群发一模一样的内容。引用对方的评论或用其昵称，转化率更高：

- 通用："这是你要的指南：[链接]"
- 更好："嗨 @maria！你问的指南在这里：[链接]，有任何问题随时问我！"

### Step 4 — 记录已回复，避免重复

把已回复的 `commentId`（及 `username`）追加到本地记录文件（例如 `skills/comment-funnel/state.txt` 或 JSON），下次运行先读入该列表：
- 已回复的评论**直接跳过**，不重复私信。
- 记录也应包含私信时间，便于后续跟进判断。

### Step 5 — 汇报结果

处理完成后，向用户汇报：
- 共扫描评论数
- 命中触发词的数量
- 成功发送私信数
- 失败原因（已回复过 / 超 7 天评论无法私信回复 / 私信限额 等）

### 跟进回复（可选）

如果用户想要跟进处理私信反映，可调用 `dhlinks_instagram`，`scope=conversations` 列出私信会话；对需要在 24 小时窗口内回复的会话，可用 `dhlinks_send_dm` 的 `recipientId` 模式回复。

## 合规要点（Meta 规则）

**允许（你正在做的）：**
- 对「评论过你帖子」的人做私信回复——这正是 Meta Private Replies API 的用途。
- 按评论者个性化私信内容。

**硬性限制：**
- 单条评论只允许一次私信回复（重复会被拒绝）。
- 评论超过 7 天后无法再做私信回复。
- 跟进私信只能在对方最后一次回复后的 **24 小时窗口**内发送（对方再回复会重置）。
- Instagram 每小时有私信发送上限（超出返回限流），不要对限流报错粗暴重试。

**会导致封号（绝不做的）：**
- 私信从未与你账号互动过的人。
- 无视限流、疯狂重试。
- 给几十上百人群发一模一样的内容。

## 常见报错

| 现象 | 原因与对策 |
|------|-----------|
| 评论读取为空或失败 | 确认传入正确的 `postId`/`postUrl`，帖子需属于当前账号；检查 DHLinks 账号是否连接了 Instagram。 |
| 私信发送被拒 | 该评论已回复过（Duplicate）；评论超过 7 天；或超出每小时私信限额——停止本批，记录已发送数量，稍后再处理剩余。 |
| 对方收不到/无法继续发 | 24 小时窗口已关闭，需等对方再次互动才能继续跟进。 |
| scope=comments 无数据 | 先确认 postId/postUrl 有效；换个帖子再试。 |

## 使用示例

**用户：**"我在最新一条 Reel 里让大家评论 CURSO 获取课程资料，帮我设置漏斗，给这些评论者私信报名链接 https://mycourse.com/enroll"

**Agent 工作流：**
1. `dhlinks_instagram`（`scope=media`）定位最新 Reel，拿到 postId。
2. `dhlinks_instagram`（`scope=comments` + postId）读取评论。
3. 逐条分析是否表达获取课程资料的意图。
4. 对命中且未回复过的：`dhlinks_send_dm`（`commentId` + 个性化 message）。
5. 汇报："共 47 条评论，31 条命中，成功私信 31 条，2 条之前已回复过；以下是明细……"

## 平台限制

本技能**仅适用于 Instagram**。其他平台（TikTok、LinkedIn、X 等）目前不提供对等的评论→私信自动化接口。这不是 DHLinks 的限制，而是各社媒平台 API 本身的区别——商业上 90%+ 的评论→私信漏斗都跑在 Instagram 上。

## 自查清单

- **短私信转化更好**：1–3 句，链接 + 简短上下文即可，没人读长私信。
- **要个性化**：引用评论或显示名。"嗨，这是你问的东西"好过"亲爱的粉丝"。
- **单一 CTA**：一条私信一个动作、一个链接。
- **越早越有效**：评论后尽快私信，打开率更高。
- **记录必须做**：不记录就分不清「已回复」和「漏发」，漏斗看似在工作实则静默漏人。