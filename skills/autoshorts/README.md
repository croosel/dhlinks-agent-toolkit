# autoshorts（DHLinks 版）

> 把长视频变成每日一批的病毒短视频片段，用于 TikTok、Instagram Reels 与 YouTube Shorts —— 带一个你可以从手机回复的人工确认步骤。

核心思路：留一个小批量的长视频 backlog，每录一条新视频就发给你的 Agent 存入输入文件夹。每天技能从该文件夹挑一个视频（最新未处理的优先，刚发的会插到队首），判断哪些瞬间值得切片，切好、叠加钩子文案，然后在同一聊天渠道问你想发布哪些。你回片段 ID，它再用 **DHLinks** 发布。

**输入视频应为 9:16 竖屏**（1080×1920 为宜）、可直接发布的成品。技能**不**负责改分辨率、裁剪或烧录字幕，只切片 + 顶部叠加钩子文案。把输入文件夹当作"接近成品的视频素材"。

## 配置

1. 拷贝 `SKILL.md` 到你的 Agent 技能目录。
2. 创建 venv 并安装依赖：`python3 -m venv venv && ./venv/bin/pip install -r requirements.txt`。
3. `cp .env.example .env`，填写：
   - `GEMINI_API_KEY` — 选片用（https://aistudio.google.com/apikey）。
   - `DHLINKS_USERNAME` / `DHLINKS_PASSWORD` — DHLinks 客户账号（发布用）。
   - `INPUT_FOLDER` / `OUTPUT_FOLDER` — 分别默认技能目录下 `input/` / `output/`。
   - `WHISPER_MODEL`, `TIMEZONE`。
4. 安装 **DHLinks MCP**，并在 `mcp/dhlinks-mcp/.env` 配置 `DHLINKS_USERNAME` / `DHLINKS_PASSWORD`。发布推荐用 AI 客户端里的 `dhlinks_publish` 工具（自动带鉴权，无需 API Key）。

## 切片是怎么选的

大多数"自动切条"工具要么只读文本（错过让瞬间好看/紧张/可转发的视觉线索），要么只看视频（切在词中间）。本技能两者都避开：

```
                长视频.mp4
                    │
      ┌─────────────┴────────────┐
      │ Whisper(本地, medium)     │ Gemini 3 Flash(多模态)
      │ 逐字时间戳                │ 收到完整视频+转写文本
      │ transcript.json           │ 看到笑声/手势/场景变化
      │                           │ 强制把首尾对齐到词边界
      └─────────────┬────────────┘ clips.json {start,end,hook,score}
                    ▼
          ffmpeg 切段 + Pillow 钩子药丸
                    ▼
          DHLinks 发布 (dhlinks_publish)
          ↳ TikTok / Instagram Reels / YouTube Shorts
```

为什么这个组合有效：

1. **Whisper 是时钟**。逐字时间戳让每一刀都切在干净的词边界上。
2. **Gemini Flash 是剪辑师**。多模态，能看到笑点落地、听到笑声、发现场景变化、对屏幕上的图表有反应；提示词强制它用 Whisper 的时间戳，所以不会凭空编 20.5s。
3. **管线有人把关**。模型提议，你把关。每个候选先切好、渲染好给你看，你审的是真实成品而不是描述。

## 用法

### 在 Agent 容器里（推荐）

技能为这个场景设计：容器跑每日 cron，推送候选到你的聊天渠道，抓回你的回复并闭环。技能本身不碰 Telegram/WhatsApp——容器负责。你只管录新视频丢进来，每天收到候选推送，用手机回 ID。装好即躺平。

### 作为独立命令行

```bash
source venv/bin/activate

# 1. 挑下一个未处理视频
python autoshorts.py pick

# 2. 转写
python autoshorts.py transcribe input/your-video.mp4

# 3. Gemini 选片
python autoshorts.py analyze input/your-video.mp4

# 4. 对 clips.json 里每条：
python autoshorts.py extract input/your-video.mp4 --start 12.34 --end 45.67 --output output/your-video/clip_1.mp4
python autoshorts.py hook output/your-video/clip_1.mp4 --text "钩子文案" --duration 3 --output output/your-video/clip_1_final.mp4

# 5. 发布（推荐直接用 dhlinks_publish 工具；也可脚本直连后端）
python autoshorts.py publish output/your-video/clip_1_final.mp4 \
    --platforms tiktok,instagram,youtube \
    --title "综合标题" --description "描述" \
    --schedule "2026-05-01T10:00:00" --timezone "Asia/Shanghai"

# 6. 标记源视频已消耗
python autoshorts.py mark-processed input/your-video.mp4 --clips-generated 5 --clips-published 3
```

### 作为每日循环

- 录好的长视频丢进 `INPUT_FOLDER`。
- cron / Agent 容器每天触发一次。
- `pick` 永远选**最新未处理**的视频。
- `state/processed.json`（sha256 键）是运行间唯一记忆，避免同一视频重复切片。
- 若你拒绝全部候选，视频仍会被标记为已处理；要重试需手动删掉它的条目。

## 怎么越用越聪明

互动数据从 DHLinks 回流到选片用的 Gemini 提示词。三个命令驱动循环：

| 命令 | 节奏 | 作用 |
|---|---|---|
| `publish`（带 `--clip-id --hook-text --viral-score --reason --video-source`） | 每部确认的片段 | 把片段完整上下文记进 `post-history.jsonl`，便于之后对应指标 |
| `learn` | 每周 | 拉最新数据、找赢家/输家、让 Gemini 刷新 `HOT.md` |
| `reflect`（可选） | 需要时 | 快速定性复盘——对比你确认/拒绝的候选，不需要指标 |

`learn` 用综合 z-score 给片段排名：`综合分 = 0.6 × z(总播放) + 0.4 × z(互动率)`。数据建议优先用 DHLinks 工具 `dhlinks_analytics` / `dhlinks_history`。

## 文件布局

```
autoshorts/
├── README.md
├── autoshorts.py          # CLI: pick/transcribe/analyze/extract/hook/preview/publish/mark-processed/learn/reflect
├── requirements.txt
├── .env / .env.example
├── input/                 # 放长视频
├── output/<video_slug>/   # transcript.json, clips.json, clip_*.mp4, clip_*_final.mp4
├── state/processed.json   # 已处理视频 hash
└── learnings/
    ├── HOT.md             # 被 learn 自动管理，拼进每次 analyze 的提示词
    ├── post-history.jsonl # 每条发布的片段
    ├── candidate-history.jsonl
    ├── metrics.jsonl      # DHLinks 分析快照
    ├── insights/          # 手动笔记（不用乱动）
    └── runs/              # learn/reflect 报告
```

## 各平台文案建议

| 平台 | 字段 | 建议长度 | 上限 | 风格 |
|---|---|---|---|---|
| YouTube Shorts | title | 40–60 字符 | 100 | 短、SEO、带关键词 |
| TikTok | title | 70–85 字符 | 90 | 钩子式，1–2 emoji，标签结尾 |
| Instagram Reels | caption | 500–800 字符 | 2200 | 长文案：钩子行 + 2–4 短段 + CTA + 20–30 标签 |

不同平台别用同一串文案。YouTube 要精简，Instagram 要有深度。

## 已知事项

- **Whisper 首跑下载**：约 1.5 GB，首次慢，之后缓存。
- **Gemini Files API 处理**：9 分钟的视频在 Google 侧要先处理 30–60 秒才能查询。脚本会轮询等待。
- **限频友好**：每日一发的设计部分是为了对 TikTok/Instagram 友好——一次性批量发 backlog 更容易被标记。
- **最新优先**：若你每天都丢新视频，旧的会在队列里等很久。这是有意为之（新内容 > 旧 backlog）。