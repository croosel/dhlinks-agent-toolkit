---
name: dhlinks-autoshorts
description: "DHLinks 长视频→短视频批量切片管线。每天从一个文件夹里挑一个长视频，用 Whisper 转写、用 Gemini 视觉选片找出高光片段、用 ffmpeg 切片并叠加钩子文案、展示给用户确认后用 DHLinks 发布（dhlinks_publish）。当用户要求：生成短视频/Reels/切片、做剪辑、把长视频改成短视频、autoshorts、病毒切片、内容再利用、每日 clip 一批等场景时触发。"
license: MIT
compatibility: "需要 ffmpeg、Python 3.11+、faster-whisper、google-genai SDK、Pillow；发布需已装 DHLinks MCP（DHLINKS_USERNAME / DHLINKS_PASSWORD）或用脚本直连 DHLinks 后端。可在 Agent 容器/服务器无头运行。"
metadata:
  version: "2.0.0"
  last-updated: "2026-09-06"
allowed-tools: Read, Write, Edit, Glob, Bash(ffmpeg:*), Bash(ffprobe:*), Bash(python3:*), Bash(curl:*), DHLinks(dhlinks_publish:*)
tags:
- video
- shorts
- repurposing
- whisper
- social-media
---

# AutoShorts — 每日病毒短视频切片管线（DHLinks）

管线脚本位于技能目录下。每天从 `INPUT_FOLDER` 挑一个长视频，用 Gemini 视觉挑出每一个可用的短视频片段，切成片段并叠加钩子文案，先把候选片段展示给用户确认，**确认后**再用 DHLinks 发布（通过 `dhlinks_publish` 工具，或脚本直连 DHLinks 后端）。

**没有明确的用户确认，绝不发布任何内容。** 用户会先看到每一个候选片段。

## 前置条件

- PATH 上有 ffmpeg（`ffmpeg -version` 验证）
- Python 3.11+，已安装 `requirements.txt` 里的依赖
- `GEMINI_API_KEY`（选片用）；发布用 **DHLinks MCP**（`DHLINKS_USERNAME` / `DHLINKS_PASSWORD` 配置在 `mcp/dhlinks-mcp/.env`）
- `INPUT_FOLDER`（放长视频）+ 可写的 `OUTPUT_FOLDER`
- DHLinks 账号里已连接要发布的平台（如 TikTok、Instagram、YouTube）

## 配置

`.env` 位于技能目录下，必填键：

```
DHLINKS_USERNAME=客户账号用户名
DHLINKS_PASSWORD=客户账号密码
GEMINI_API_KEY=...
INPUT_FOLDER=/abs/path/to/long/videos
OUTPUT_FOLDER=/abs/path/to/clip/output
WHISPER_MODEL=medium
TIMEZONE=Asia/Shanghai
```

- `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`：发布视频时的鉴权凭证。若在 AI 客户端已装 DHLinks MCP 并用 `dhlinks_publish` 工具，则脚本内可不必读取这两个变量；只有直连后端脚本才需要。
- 若任一必填键缺失，先向用户索取，不要臆造。

## 编排模型

本技能适合由 Agent 容器按天触发。切片候选以「文本 + 绝对文件路径」呈现给用户；用户确认要发布的片段后，再用 `dhlinks_publish` 发布。AI 客户端会把候选表 + 视频文件送到用户端，用户回复片段 ID（如 "1, 3, 5"），Agent 继续执行发布。

## 指令（流程）

1. **校验配置** — `.env` 齐全、ffmpeg 存在、Python 虚拟环境已安装。缺什么先问用户。
2. **挑一个视频** — 每次一个，不要批处理。
3. **Whisper 转写** — 用配置的模型大小。
4. **Gemini 选片** — 对转写文本和视频本身用 Gemini 视觉挑片段。
5. **ffmpeg 切片 + 叠加钩子文案**。
6. **把候选展示给用户，等确认**。绝不发布未经确认的片段。
7. **发布确认的片段** — 用 `dhlinks_publish`（或脚本），并汇报每个平台的结果。
8. 可选：跑每周学习循环，把表现反馈进选片。

下面详细版是这套流程的具体实现。

## 每日工作流

本技能按**每日循环**运行。每次挑一个视频走完管线。`pick` 采用「每轮循环内不重复」：当前周期内每个视频至多处理一次，全部处理完后自动开启新一轮。状态记录在 `state/processed.json`。

### Step 0 — 预检（每次调用都要做，不要跳过）

1. **Python venv** 是否存在。没有就先建。
2. **ffmpeg** 是否在 PATH。没有就让用户 `brew install ffmpeg`（不要自己全局装）。
3. **`.env`** 是否齐全：
   - `GEMINI_API_KEY` 缺失 → 向用户要。
   - `DHLINKS_USERNAME` / `DHLINKS_PASSWORD` 缺失 → 向用户要（若走 `dhlinks_publish` 工具可无需这两个，但建议都配好）。
   - `INPUT_FOLDER` / `OUTPUT_FOLDER` 缺失 → 默认到技能目录下 `input/` / `output/` 并写入 `.env`。
   - `WHISPER_MODEL` 默认 `medium`；`TIMEZONE` 默认 `Asia/Shanghai`。
4. **平台可用性** — 用 DHLinks 确认要发布的平台已连接、无需重新授权。

**输入视频格式**：`INPUT_FOLDER` 里的视频应是 9:16 竖屏、可直接发布的成品（1080×1920 典型）。若用户字幕已烧录在源视频上，就保留。本技能**不**负责改分辨率、裁剪、缩放或烧录字幕——只做切片和叠加钩子文案。横屏或非 9:16 的视频，先跟用户确认再处理。

### Step 1 — 挑视频

```bash
python autoshorts.py pick
```

返回 JSON，含 `path`、`name`、`size_mb`、`mtime`、`duration_s`、`previous_cycles_completed`、`remaining_in_cycle`、`cycle_started_at`、`new_cycle_started` 等字段。若 `new_cycle_started` 为 true，向用户简要说明"开启新一轮——该视频之前已切过 N 次，找新素材"。只有 `INPUT_FOLDER` 为空才是硬停——此时告诉用户丢个视频进来。

### Step 2 — 转写

```bash
python autoshorts.py transcribe "<VIDEO_PATH>"
```

写入 `output/<video_slug>/transcript.json`（句段 + 逐字时间戳）。Whisper 自动检测语言，默认模型 `medium`。

### Step 3 — Gemini 选片

```bash
python autoshorts.py analyze "<VIDEO_PATH>"
```

把视频传给 Gemini Files API，让 `gemini-3-flash-preview` 返回每一个候选短视频片段（20–60s）和时间戳（对齐到词边界）。输出 `output/<video_slug>/clips.json`。

### Step 4 — 切片 + 加钩子

对 `clips.json` 里的每一条，跑两条命令：

```bash
python autoshorts.py extract "<VIDEO_PATH>" \
    --start <START> --end <END> \
    --output "output/<slug>/clip_<ID>.mp4"

python autoshorts.py hook "output/<slug>/clip_<ID>.mp4" \
    --text "<HOOK_TEXT>" --duration 3 \
    --output "output/<slug>/clip_<ID>_final.mp4"
```

钩子文案是 TikTok/Instagram 风格：每行文本独立黑底圆角药丸（78% 不透明度），白字加黑描边。放在画面顶部前 3 秒。先一次性把**所有**候选都切好、叠好——用户要看真实成品，而不是元数据。

### Step 4.5 — 勾子的视觉质检（你自己看，不用再调 Gemini）

你是多模态的。把每个 `clip_<ID>_final.mp4` 抽一帧（t=1.0s）看一下：

```bash
python autoshorts.py preview output/<slug>/clip_<ID>_final.mp4
```

用 **Read** 工具打开生成的 PNG。检查：钩子文字是否完整可见、药丸是否超出安全区、是否挡住说话人/关键内容、重音/特殊字符（如 á é í ó ú ñ）是否正常、是否与底部字幕冲突、有无渲染异常。在 Step 5 的表格里加一列 `QA`（✅ 或 ⚠️ 说明问题）。**不要静默丢弃有问题的片段**——展示给用户并给出警告，由用户决定。

### Step 5 — 展示给用户

展示一个 Markdown 表格：

| ID | 时长 | Hook | 评分 | QA | 理由 | 文件 |
|----|------|------|------|----|------|------|

**必须在表里带上绝对文件路径**，这样 AI 客户端才能把真实视频附给用户。然后问：

> **要发布哪几个片段 ID？（例如 `1, 3, 5`，或 `none`。）**

等用户回复。若用户回 `none`（全部拒绝），直接跳到 Step 8，用 `--clips-published 0` 标记已处理。这样明天 `pick` 会选下一个视频。

### Step 6 — 为确认的片段生成各平台文案

这一步由你（Agent）直接写，不调工具。匹配视频语言：
- **TikTok**（title，上限 90 字符）：钩子式开场，1–2 个 emoji，结尾混排标签。甜点 ~70–85 字符。
- **Instagram Reels**（caption，上限 2200 字符）：长文案——首行是钩子，正文 2–4 段短句（用 `\n\n`），CTA 后加 20–30 个大小混排标签。甜点 500–800 字符。
- **YouTube Shorts**（title，上限 100 但建议 ~40–60 字符）：SEO 关键词优先，描述强调可搜索性，最多 3–5 个标签。
- 通用 `title` / `description` 给其它平台。

发布前先把生成的文案回显给用户确认。

### Step 7 — 发布（推荐：`dhlinks_publish` 工具）

**方式 A（推荐）：AI 客户端内用 `dhlinks_publish` 工具**

```
dhlinks_publish {
  "platforms": ["tiktok", "instagram", "youtube"],
  "type": "video",
  "title": "<GENERAL_TITLE>",
  "mediaBase64": "<clip 的 base64>",   // 或用 mediaUrl
  "mode": "now"                        // 或 schedule / queue
}
```

- 平台：`platforms` 数组，空 = 全部 22 平台。
- 类型：`type: "video"`。
- 标题：`title` 必填。
- 媒体：`mediaBase64`（≤50MB）或 `mediaUrl`。
- 模式：`now`（立刻）/ `schedule`（定时）/ `queue`（排队）。
- 一个平台一天一个片段，从明天 `10:00`（`TIMEZONE`）起排，后续每天 +1 天。

**方式 B：脚本直连 DHLinks 后端**（无 MCP 客户端时）

```bash
python autoshorts.py publish "output/<slug>/clip_<ID>_final.mp4" \
    --platforms tiktok,instagram,youtube \
    --title "<GENERAL>" --description "<DESCRIPTION>" \
    --instagram-title "<INSTAGRAM_CAPTION>" \
    --schedule "<ISO_DATE>" --timezone "Asia/Shanghai" \
    --clip-id <ID> --hook-text "<HOOK_TEXT>" \
    --viral-score <GEMINI_SCORE> --reason "<GEMINI_REASON>" \
    --video-source "<SOURCE_VIDEO_FILENAME>"
```

脚本会先 `POST https://api.dh-gos.online/api/login` 拿 token，再 `POST /api/publish`（video + mediaBase64）。`--clip-id`、`--hook-text`、`--viral-score`、`--reason`、`--video-source` 不是可选项——它们喂给学习循环，没有它们 `learn` 无法把互动指标对应回钩子模式。

**先跑 `--dry-run` 展示实际请求载荷，用户说"开始"再真正发布。**

### Step 8 — 标记视频已处理

```bash
python autoshorts.py mark-processed "<VIDEO_PATH>" \
    --clips-generated <N_CANDIDATES> --clips-published <N_APPROVED>
```

把视频 hash 追加进 `state/processed.json`，这样明天 `pick` 会跳过它。**即使用户全拒（`--clips-published 0`）也要标记**——被拒的视频也算消耗掉。唯一不标记的场景是管线中途崩了（如 Gemini 报错未产出片段），这种情况让用户明天重试同一条视频。

### Step 8.5 — 复盘（可选、快速、定性）

```bash
python autoshorts.py reflect --window-days 30
```

对比近期的「提供过的候选」和「被确认的」片段，让 Gemini 提炼定性规律（如"有具体数字的钩子通过率高，问句钩子被拒"）。输出到 `learnings/runs/reflect-….md`，**不会**自动写回 HOT.md，供用户阅读和人工筛选。周更即可，别天天跑。

### Step 9 — 最终总结

打印表格：每个发布片段（ID、文件、时长、Hook、计划时间、平台）+ 源视频名 + 生成 vs 发布的候选数。

## 每周学习循环（learn）

本技能会越用越聪明。历史片段的互动数据（播放、点赞、评论、转发、收藏——来自 DHLinks 数据）会被喂回选片提示词。

### 节奏

`learn` **每周**跑一次，别天天跑。

```bash
python autoshorts.py learn
```

默认：7 天 soak（太新的不算）、90 天上限（太旧的忽略）、综合分 = 0.6·播放 + 0.4·互动率、取前/后 20% 作为赢家/输家。

### 它做什么

1. 读 `learnings/post-history.jsonl`（每条发布过的片段 + 钩子 + Gemini 评分/理由 + 源视频）。
2. soak 窗口内的每条片段，从 DHLinks 后端取指标（脚本 `GET /api/history/{rid}` 或 `dhlinks_analytics` / `dhlinks_history` 工具）。
3. 计算每条综合分，取前 20%（赢家）和后 20%（输家）。
4. 把赢家 + 输家 + 现有 `learnings/HOT.md` 给 Gemini Flash，让它产出更新版 HOT.md（≤80 行，只收录有证据支撑的规律）。
5. 写新 HOT.md（旧备份为 `HOT.YYYYMMDD-HHMMSS.md.bak`）。
6. 写完整审计到 `learnings/runs/learn-YYYY-MM-DD.md`，让用户看到究竟是哪些片段被算作赢家/输家、学习结论如何变化。

> **数据来源建议**：在 AI 客户端里，优先用 DHLinks 工具 `dhlinks_analytics`（platforms 数组，缺省全部）和 `dhlinks_history` 拿数据，比脚本直连后端更稳。

### HOT.md 如何反馈

`analyze` 时会自动读 `learnings/HOT.md`（若存在且非空），以「PRIOR LEARNINGS」前缀拼进 Gemini 提示词，让它选片、写钩子时参考这些规律。

### 何时跑 `learn`

- 手动：`python autoshorts.py learn`
- 定时（cron / Agent 容器）：每周一 `cd <技能目录> && ./venv/bin/python autoshorts.py learn`
- `post-history.jsonl` 少于 ~10 条时跳过合成（"5 赢家 + 5 输家"下限不满足会短路，写一条"数据不足"说明）。

### 不要做

- 不要既手动改 HOT.md 又继续跑 `learn`（会被覆盖）。想加手动规则放 `learnings/insights/`。
- 不要删 `post-history.jsonl` / `metrics.jsonl`（只追加的记忆，删了 learn 从头开始）。
- 不要超过一周一次跑 `learn`。

## 输出

每次运行产出 `OUTPUT_FOLDER` 下的切片 + 待确认列表。发布后逐片段逐平台汇报，成功给 URL，失败给原因。**明确暴露失败**——静默失败的片段看起来像是发布成功了。

## 安全

- **发布到公开 feed 需要 `--confirm-public`。** 否则命令拒绝。每日流程先把候选给用户看，用这个 flag 把"用户确认"落实到代码。
- 用 `--dry-run` 检查实际请求。
- ffmpeg 用参数列表调用，不用 shell 字符串；钩子文案渲染成 PNG 再合成，而不是喂给 ffmpeg 的 `drawtext`——这样 AI 写的钩子没法注入过滤器或命令。
- 凭证从环境变量读取，绝不打印。

## 常见报错

- **ffmpeg 缺失或切片失败** — 先查 `ffmpeg -version`。某条切片失败不应中断整批：跳过、汇报、继续其余的。
- **Whisper 内存不足** — 把 `WHISPER_MODEL` 调小（`small` / `base`）重跑。
- **Gemini 一个片段都没返回** — 源视频真的没有可排名的素材，如实汇报，别降低标准硬凑。
- **DHLinks 登录 401 / 无 token** — 检查 `.env` 的 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD` 是否正确。
- **视频超过 50MB，`mediaBase64` 失败** — 压缩或改用 `mediaUrl`。
- **一个平台成功、其余失败** — 正常。按平台汇报，只重试失败项，不要重切片段。

## 示例

**正常每日运行**

```bash
cd <技能目录> && source venv/bin/activate
python3 autoshorts.py daily
```

**指定某个视频重跑**

```bash
python3 autoshorts.py daily --video "/abs/path/to/interview-2026-08.mp4"
```

**每周学习循环**

```bash
python3 autoshorts.py learn
```

## 运行注意

- 在 Step 4（重型 ffmpeg 工作）和 Step 7（发布不可逆）前都要确认。
- Gemini 返回畸形 JSON 时，原始响应会存到 `output/<slug>/clips.raw.txt`，读它手动重提示。
- 钩子文案来自 Gemini 且与视频同语言，不要翻译。
- 所有切片文件是 `OUTPUT_FOLDER/<video_slug>/` 下的绝对路径。向 AI 客户端清晰给出，方便它在发给用户时附上真实视频。
- `state/processed.json` 是运行间**唯一**的记忆。用户说"重跑视频 X"时，先确认，再从 `state/processed.json` 手动移除对应条目。
- Whisper `medium`（约 1.5 GB）首次转写会下载，提醒用户首跑更久。