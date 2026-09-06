# DHLinks Agent 安装包

**一句话，发遍 22 个平台** —— 让 AI Agent 连上你的 DHLinks 账号，用自然语言发布、看数据、回评论私信。

## 前置条件
- 电脑已装 Node.js（≥ 18）：终端跑 `node -v` 确认
- 用的 AI 客户端是 **TraeCode** 或 **Claude Code**
- 已有 DHLinks 客户账号，且已在后台连接至少一个社媒平台

## 安装（4 步，约 3 分钟）

| 步骤 | 做什么 | 命令/操作 |
|---|---|---|
| 1 | 解压 | 把 `dhlinks-agent-toolkit.zip` 解压到某个文件夹 |
| 2 | 填账号 | 打开 `mcp/dhlinks-mcp/.env`，填 `DHLINKS_USERNAME` 和 `DHLINKS_PASSWORD` |
| 3 | 一键安装 | 有交互界面的直接**把整个文件夹拖进 AI 对话框**，说「帮我安装这个 DHLinks 安装包」；命令行则跑 `node install.js` |
| 4 | 验证 | 自动跑 `node verify.js`，看到 **4 PASS**（无凭证时账号项为 SKIP）即成功；然后**重启 AI 客户端会话** |

装完技能（可选）：`node install.js --install-skills`（把 4 个技能装进 AI 客户端，名称带 `dhlinks-` 前缀）。

## 自带技能

| 技能 | 用处 |
|---|---|
| dhlinks-comment-funnel | 抓帖子评论 → 按关键词 → 自动私信回复评论者（引流） |
| dhlinks-autoshorts | 长视频 → Whisper 转写 + ffmpeg 切片 → 短视频发布 |
| dhlinks-viraloop | 竞品轮播图文 → 一键发布 → 数据复盘反哺 |
| dhlinks-larry-marketing | App 营销策划 → 轮播生成 → 发布与日报 |

## 试试这些说法
- 「用我的 DHLinks 账号把这段内容发到全部 22 个平台」
- 「看我最近发布的 5 条帖子表现怎么样」
- 「把 A 帖子下面评论了『优惠』的人，私信回复领券链接」
- 「把《xxx.mp4》切成 4 条 Reels 短视频」

## 故障自查
- `node verify.js` 出现 FAIL：按提示修（多为 .env 没填好 / 没有连接平台）
- 工具用不了：先确认 `mcp/dhlinks-mcp/.env` 填了账号，再**重启 AI 客户端会话**
- 不会填凭证？把 .env 的说明发给 AI，它会帮你
 
本安装包**不含任何密码**，账号凭证只存你自己的 `.env`（已加入忽略清单）。