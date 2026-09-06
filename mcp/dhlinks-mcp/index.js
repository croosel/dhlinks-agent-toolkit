#!/usr/bin/env node
/**
 * DHLinks MCP Server —— 白标社媒发布封装。
 *
 * 让任何 MCP 兼容的 AI 客户端（Claude Code / TraeCode / Cursor…）用「一句话」替你：
 *   - 发布到 DHLinks 客户账号已连接的多个社媒平台（video / photos / text）
 *   - 查看发布历史
 *   - 查看投放效果（展示量）
 *
 * 鉴权：用 DHLinks 客户账号（用户名/密码）POST {base}/api/login 换取 token，
 *      作为 Authorization: Bearer 传给 DHLinks 后端。不直接依赖供应商 API Key。
 *
 * 环境变量：
 *   DHLINKS_BASE_URL   DHLinks 后端根地址（默认 https://api.dh-gos.online）
 *   DHLINKS_USERNAME   客户账号用户名（如 DH-GOS）
 *   DHLINKS_PASSWORD   客户账号密码
 */
import { readFileSync } from 'node:fs'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

/** 从同目录 .env（gitignore，不进仓库）加载可选的 DHLINKS_* 凭证。已设置的环境变量优先。 */
function loadDotEnv() {
  try {
    const raw = readFileSync(new URL('./.env', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
      if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {
    /* .env 不存在时忽略 */
  }
}
loadDotEnv()

const BASE_URL = (process.env.DHLINKS_BASE_URL || 'https://api.dh-gos.online').replace(/\/+$/, '')
const USERNAME = process.env.DHLINKS_USERNAME
const PASSWORD = process.env.DHLINKS_PASSWORD

let token = null

async function ensureAuth(force = false) {
  if (token && !force) return
  if (!USERNAME || !PASSWORD) {
    throw new Error('缺少 DHLINKS_USERNAME / DHLINKS_PASSWORD 环境变量（客户账号）')
  }
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.token) {
    throw new Error(`DHLinks 登录失败(${res.status}): ${data.error || data.message || 'invalid_credentials'}`)
  }
  token = data.token
}

/** 统一调用：自动登录；遇 401 强制重登重试一次。 */
async function call(method, path, body, { retried = false } = {}) {
  await ensureAuth()
  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && !retried) {
    await ensureAuth(true)
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }
  return res
}

async function httpJson(name, method, path, body) {
  const res = await call(method, path, body)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${name}失败(${res.status}): ${data.message || data.error || res.statusText}`)
  }
  return data
}

/** 构建查询字符串；undefined/null/空值跳过。 */
function qs(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

const server = new McpServer({
  name: 'dhlinks',
  version: '0.1.0',
})

server.registerTool(
  'dhlinks_account',
  {
    title: 'DHLinks 账号信息',
    description: '查看当前 DHLinks 客户账号的信息：用户名、套餐、试用到期时间（用于首发前确认以哪个账号发布）。',
  },
  async () => {
    const data = await httpJson('查询账号', 'GET', '/api/account')
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'dhlinks_publish',
  {
    title: 'DHLinks 一键发布',
    description:
      '用 DHLinks 客户账号把内容发布到它已连接的多个社媒平台（22 个平台）。' +
      'type 为 video/photos 时必须提供 mediaBase64（≤50MB，base64 字符串）或 mediaUrl（公网 URL）二者其一；' +
      'type 为 text 时无需媒体（title 即正文）。platforms 传平台英文标识数组，如 ["tiktok","instagram"]，' +
      '为空数组表示发布到已连接的全部平台。mode 支持 now/schedule/queue。',
    inputSchema: {
      platforms: z.array(z.string()).describe('目标平台，如 ["tiktok","instagram","youtube"]').optional(),
      type: z.enum(['video', 'photos', 'text']).describe('内容类型'),
      title: z.string().describe('标题 / 正文（必填）'),
      caption: z.string().describe('文案（可选）').optional(),
      mediaBase64: z.string().describe('媒体文件 base64（≤50MB），video/photos 用').optional(),
      mediaUrl: z.string().describe('媒体公网 URL（video/photos 用）').optional(),
      mediaFilename: z.string().describe('媒体文件名，默认 upload.mp4/upload.jpg').optional(),
      mode: z.enum(['now', 'schedule', 'queue']).describe('发布模式，默认 now').optional(),
      scheduledDate: z.string().describe('定时 ISO 8601 时间（mode=schedule 时必填，须晚于当前）').optional(),
      idempotencyKey: z.string().describe('幂等键（可选）').optional(),
    },
  },
  async (args) => {
    const data = await httpJson('发布', 'POST', '/api/publish', {
      platforms: args.platforms || [],
      content: {
        type: args.type,
        title: args.title,
        ...(args.caption !== undefined ? { caption: args.caption } : {}),
        ...(args.mediaBase64 !== undefined ? { mediaBase64: args.mediaBase64 } : {}),
        ...(args.mediaUrl !== undefined ? { mediaUrl: args.mediaUrl } : {}),
        ...(args.mediaFilename !== undefined ? { mediaFilename: args.mediaFilename } : {}),
      },
      mode: args.mode || 'now',
      ...(args.scheduledDate !== undefined ? { scheduledDate: args.scheduledDate } : {}),
      ...(args.idempotencyKey !== undefined ? { idempotencyKey: args.idempotencyKey } : {}),
    })
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'dhlinks_history',
  {
    title: 'DHLinks 发布历史',
    description: '查看当前 DHLinks 客户账号的历史发布记录。',
  },
  async () => {
    const data = await httpJson('查询历史', 'GET', '/api/publish/history')
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'dhlinks_analytics',
  {
    title: 'DHLinks 投放数据',
    description: '查看 DHLinks 客户账号的投放效果（各平台展示量 + 总展示量，最近 30 天）。',
    inputSchema: {
      platforms: z.array(z.string()).describe('指定平台，如 ["tiktok"]；省缺则查已连接全部平台').optional(),
    },
  },
  async (args) => {
    const q = args.platforms && args.platforms.length ? `?platforms=${encodeURIComponent(args.platforms.join(','))}` : ''
    const data = await httpJson('查询数据', 'GET', `/api/analytics${q}`)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'dhlinks_instagram',
  {
    title: 'DHLinks Instagram 内容与互动查询',
    description:
      '查看当前 DHLinks 账号在 Instagram 上的内容与互动。scope=media 列出最近帖子/Reels；' +
      'scope=comments 读取某帖子的评论（postId 或 postUrl 二选一）；scope=conversations 列出现有私信会话。',
    inputSchema: {
      scope: z.enum(['media', 'comments', 'conversations']).describe('查询范围：media=近期帖子 / comments=帖子评论 / conversations=私信会话'),
      postId: z.string().describe('帖子数字 ID（scope=comments 时与 postUrl 二选一）').optional(),
      postUrl: z.string().describe('帖子完整 URL，如 https://www.instagram.com/p/ABC123（scope=comments 时与 postId 二选一）').optional(),
      limit: z.number().int().min(1).max(50).describe('每页条数 1-50（默认官方值）').optional(),
      after: z.string().describe('分页游标（上一页返回的 pagination.next_cursor）').optional(),
    },
  },
  async (args) => {
    let data
    if (args.scope === 'media') {
      data = await httpJson('查询媒体', 'GET', `/api/instagram/media${qs({ limit: args.limit, after: args.after })}`)
    } else if (args.scope === 'comments') {
      if (!args.postId && !args.postUrl) throw new Error('scope=comments 时必须提供 postId 或 postUrl')
      data = await httpJson(
        '查询评论',
        'GET',
        `/api/instagram/comments${qs({ postId: args.postId, postUrl: args.postUrl, limit: args.limit, after: args.after })}`
      )
    } else {
      data = await httpJson('查询私信', 'GET', `/api/instagram/dms/conversations${qs({ limit: args.limit })}`)
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'dhlinks_send_dm',
  {
    title: 'DHLinks 发送 Instagram 私信',
    description:
      '用当前 DHLinks 账号给 Instagram 用户发私信（DM）。两种模式：commentId=某条评论的 ID（私信回复该评论作者，适合评论互动转化）；' +
      'recipientId=用户数字 ID（直发私信，需对方先发过消息且在 24 小时窗口内）。message 必填；' +
      '可带 buttons 最多 3 个网页按钮 [{title,url}]。注意 Instagram 对主动私信有 24h 窗口与每日限额限制。',
    inputSchema: {
      message: z.string().describe('私信正文（必填）'),
      commentId: z.string().describe('评论 ID（与 recipientId 二选一；私信回复该评论作者）').optional(),
      recipientId: z.string().describe('用户数字 ID（与 commentId 二选一；直发私信）').optional(),
      buttons: z
        .array(z.object({ title: z.string().max(20), url: z.string() }))
        .max(3)
        .describe('私信内网页按钮（最多 3 个，title ≤20 字符，url 需 http/https）')
        .optional(),
    },
  },
  async (args) => {
    if (!args.commentId && !args.recipientId) throw new Error('commentId 与 recipientId 必须二选一')
    const path = args.commentId ? '/api/instagram/comments/reply' : '/api/instagram/dms/send'
    const body = {
      message: args.message,
      ...(args.commentId ? { commentId: args.commentId } : { recipientId: args.recipientId }),
      ...(args.buttons !== undefined ? { buttons: args.buttons } : {}),
    }
    const data = await httpJson('发送私信', 'POST', path, body)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)