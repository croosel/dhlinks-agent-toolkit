# 评论→私信转化漏斗（DHLinks 技能）

基于 **DHLinks** 的 AI Agent 技能，用于构建 Instagram「评论→私信」转化漏斗。

创作者发帖"评论 GUIDE 领取免费 PDF"→ 粉丝评论 → AI Agent 自动给每位评论者发个性化私信。全自动。

## 它能做什么

- 读取 Instagram 帖子评论，检测触发关键词
- 用语义匹配（不只精确关键词）识别索取意图
- 给命中的评论者发送个性化私信
- 记录谁已被联系，避免重复打扰
- 可选：读取私信会话，跟进对话
- 输出漏斗数据（扫描评论数、私信数、收到的回复）

## 支持的平台

| 平台 | 读评论 | 私信回复 | 跟进私信 |
|------|--------|----------|----------|
| Instagram | ✓ | ✓ | ✓ |

仅 Instagram——这是 Meta API 的限制。

## 安装

把本目录复制到你的 Agent 技能目录即可。到 `SKILL.md` 可查看完整工作流。

## 配置

1. 安装 **DHLinks MCP**。
2. 在 `mcp/dhlinks-mcp/.env` 配置客户账号：
   ```env
   DHLINKS_USERNAME=客户账号用户名
   DHLINKS_PASSWORD=客户账号密码
   ```
3. 客户在 DHLinks 账号里连接 **Instagram 企业号/创作者账号**。
4. AI 客户端里的 `dhlinks_*` 工具自动携带鉴权，无需 API Key。

## 用法示例

对你的 AI Agent 说：

> "在 https://instagram.com/p/ABC123 设置一个评论漏斗——凡是评论 GUIDE 的，都私信它下载链接 https://example.com/guide"

Agent 会：
1. 用 `dhlinks_instagram`（scope=comments）读取该帖评论
2. 筛选含 "guide" 的评论（大小写/重音不敏感）
3. 用 `dhlinks_send_dm`（commentId 模式）给每位命中者发带链接的私信
4. 记录已回复列表，避免重复

## 合规

本技能使用 Meta 官方 [Private Replies API](https://developers.facebook.com/docs/instagram-platform/private-replies/)——ManyChat 等主流私信自动化采用同一机制。详见 `references/compliance.md`。

## License

MIT