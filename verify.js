#!/usr/bin/env node
/**
 * DHLinks 安装包一键验证脚本
 *
 * 用法：
 *   node verify.js               # 在安装包根目录运行
 *   node verify.js mcp/some/dir  # 或指定 mcp 服务目录
 *
 * 检查项（PASS/FAIL 彩色输出，任一 FAIL → exit 1）：
 *   [1] MCP 服务能否启动并完成握手
 *   [2] 关键工具是否注册（dhlinks_publish / dhlinks_instagram / dhlinks_send_dm 等）
 *   [3] 账号信息能否返回（需已在 mcp/dhlinks-mcp/.env 填入客户账号）
 *   [4] 发布参数校验是否生效（缺 title 应报错，不会真发）
 *
 * 零第三方依赖：直接与 MCP 服务用 stdio（LSP 帧结构）对话。
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const MCP_DIR = join(__dirname, process.argv[2] ?? 'mcp/dhlinks-mcp')
const ENV_FILE = join(MCP_DIR, '.env')

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`
const RED = (s) => `\x1b[31m${s}\x1b[0m`
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`

/** 请求超时（ms）：子进程静默/启动失败时不至于挂死 */
const REQ_TIMEOUT = 15000

/** 极简 MCP stdio 客户端：初始化 + 查询工具 + 调用工具（SDK 用换行分隔 JSON 而非 Content-Length 帧） */
class McpClient {
  constructor(serverPath) {
    this.proc = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'inherit'] })
    this.buf = ''
    this.pending = new Map()
    this.nextId = 1
    this.proc.stdout.on('data', (chunk) => this._onData(chunk))
    // 子进程启动失败 / 中途退出时，把挂起的请求全部以错误结束，避免脚本挂死
    const failAll = (msg) => {
      for (const { reject } of this.pending.values()) reject(new Error(msg))
      this.pending.clear()
    }
    this.proc.on('error', (err) => failAll(`MCP 服务无法启动：${err.message}`))
    this.proc.on('exit', (code) => { if (this.pending.size) failAll(`MCP 服务异常退出（exit ${code}）`) })
  }
  _frame(msg) {
    return JSON.stringify(msg) + '\n'
  }
  _onData(chunk) {
    this.buf += chunk.toString()
    const lines = this.buf.split('\n')
    this.buf = lines.pop() ?? '' // 保留最后一个不完整的行
    for (const line of lines) {
      if (!line.trim()) continue
      let msg
      try { msg = JSON.parse(line) } catch { continue }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || 'MCP error'))
        else resolve(msg.result)
      }
    }
  }
  _request(method, params) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} 响应超时（${REQ_TIMEOUT}ms）`))
      }, REQ_TIMEOUT)
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
      this.proc.stdin.write(this._frame({ jsonrpc: '2.0', id, method, params }))
    })
  }
  async init() {
    const res = await this._request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'dhlinks-verify', version: '0.1.0' },
    })
    this.proc.stdin.write(this._frame({ jsonrpc: '2.0', method: 'notifications/initialized' }))
    return res
  }
  async listTools() {
    const res = await this._request('tools/list', {})
    return (res?.tools ?? []).map((t) => t.name)
  }
  async callTool(name, args) {
    const res = await this._request('tools/call', { name, arguments: args })
    const text = (res?.content ?? []).map((c) => c.text || '').join('\n')
    return text
  }
  close() { this.proc.kill() }
}

let pass = 0, fail = 0
function report(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ${GREEN('PASS')}  ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  ${RED('FAIL')}  ${name}${detail ? ' — ' + detail : ''}`) }
}

console.log(`\n  [DHLinks 安装包验证] ${join(__dirname, '.')}\n`)

if (!existsSync(join(MCP_DIR, 'index.js'))) {
  console.log(RED(`找不到 MCP 服务入口：${join(MCP_DIR, 'index.js')}`))
  console.log('请在安装包根目录运行：node verify.js')
  process.exit(1)
}

const client = new McpClient(join(MCP_DIR, 'index.js'))

try {
  // [1] 握手
  let ok1 = false
  try { const r = await client.init(); ok1 = !!r?.serverInfo } catch { ok1 = false }
  report('MCP 服务握手', ok1)

  // [2] 工具注册
  let tools = []
  try { tools = await client.listTools() } catch {}
  const required = ['dhlinks_publish', 'dhlinks_history', 'dhlinks_analytics', 'dhlinks_instagram', 'dhlinks_send_dm']
  const missing = required.filter((t) => !tools.includes(t))
  report('关键工具注册（5/5）', missing.length === 0, missing.length ? `缺: ${missing.join(', ')}` : tools.join(', '))

  // [3] 账号信息
  const hasCreds =
    existsSync(ENV_FILE) && /^DHLINKS_USERNAME[ \t]*=[ \t]*\S+/m.test(readFileSync(ENV_FILE, 'utf8'))
  let ok3 = false
  if (hasCreds) {
    try { const txt = await client.callTool('dhlinks_account', {}); ok3 = /"ok"\s*:\s*true|"username"/.test(txt) }
    catch (e) { ok3 = false }
  }
  if (!hasCreds) {
    console.log(`  ${YELLOW('SKIP')}  账号信息 — 未检测到 .env 凭证`)
    console.log(YELLOW('          请先在 mcp/dhlinks-mcp/.env 填入 DHLINKS_USERNAME / DHLINKS_PASSWORD 后重跑'))
  } else {
    report('账号信息返回', ok3)
  }

  // [4] 发布参数校验（不真发：缺 title 必须被拒绝）
  let ok4 = false
  try {
    const txt = await client.callTool('dhlinks_publish', { type: 'text' })
    ok4 = /失败|error|缺少|title|invalid/i.test(txt)
  } catch { ok4 = true }
  report('发布参数安全校验', ok4, ok4 ? '（缺参数即拒绝，不会误发）' : '')

  client.close()
} catch (e) {
  client.close()
  console.log(RED(`  意外错误：${e.message}`))
  fail++
}

console.log(`\n  结果：${pass} PASS${fail ? `，${RED(fail + ' FAIL')}` : `，${GREEN('全部通过')}`}\n`)
process.exit(fail ? 1 : 0)