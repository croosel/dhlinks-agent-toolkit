#!/usr/bin/env node
/**
 * DHLinks 安装包一键安装（客户把安装包拖进 AI 对话框后，由 AI 执行本脚本）
 *
 * 用法：
 *   node install.js                      # 默认：生成 .mcp.json + 准备 .env 模板 + 跑验证
 *   node install.js --install-skills     # 额外把 4 个技能软链到 ~/.trae-cn/skills 与 ~/.claude/skills
 *
 * 干的事：
 *   [1] 检查 MCP 服务完整性（index.js + node_modules）
 *   [2] 若 mcp/dhlinks-mcp/.env 不存在，从 .env.example 复制模板（凭证需客户自己填）
 *   [3] 在本目录生成 .mcp.json（server = dhlinks，绝对路径指向 index.js）→ 用 TraeCode / Claude Code
 *       打开本目录即自动连接 MCP
 *   [4] （--install-skills）把 skills/* 软链到 ~/.trae-cn/skills 与 ~/.claude/skills
 *   [5] 自动运行 node verify.js 验证，全程输出中文说明
 */
import { cpSync, existsSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const MCP_DIR = join(ROOT, 'mcp/dhlinks-mcp')
const INSTALL_SKILLS = process.argv.includes('--install-skills')

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`
const step = (n, s) => console.log(`\n  [${n}] ${s}`)

console.log('\n  ══════════ DHLinks 安装包 · 一键安装 ══════════\n')

// [1] 完整性
console.log('  [1] 检查 MCP 服务…')
if (!existsSync(join(MCP_DIR, 'index.js')) || !existsSync(join(MCP_DIR, 'node_modules'))) {
  console.error('  ✗ 缺少 mcp/dhlinks-mcp/index.js 或 node_modules，安装包不完整。')
  process.exit(1)
}
console.log(GREEN('      ✓ index.js 与依赖齐全'))

// [2] .env 模板
step('2', '准备凭证文件（.env）…')
const envFile = join(MCP_DIR, '.env')
const envExample = join(MCP_DIR, '.env.example')
if (!existsSync(envFile) && existsSync(envExample)) {
  cpSync(envExample, envFile)
  console.log(YELLOW('      已生成 .env 模板 → 请把 DHLINKS_USERNAME / DHLINKS_PASSWORD 填进去'))
  console.log(YELLOW('      （不发消息/发布时可不填，但至少做完这步才能用）'))
} else if (existsSync(envFile)) {
  console.log('      .env 已存在，跳过')
} else {
  console.log(YELLOW('      未找到 .env.example，请手动创建 .env'))
}

// [3] .mcp.json
step('3', '生成 .mcp.json（自动连接 MCP）…')
const mcpConfig = {
  mcpServers: {
    dhlinks: {
      command: process.execPath,
      args: [join(MCP_DIR, 'index.js')],
      env: {
        DHLINKS_BASE_URL: process.env.DHLINKS_BASE_URL || 'https://api.dh-gos.online',
      },
    },
  },
}
writeFileSync(join(ROOT, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n')
console.log(GREEN('      ✓ .mcp.json 已写入')
  + '（用 TraeCode / Claude Code 打开本目录即可用；账号凭证读取 mcp/dhlinks-mcp/.env）')

// [4] skills 软链
if (INSTALL_SKILLS) {
  step('4', '安装 4 个技能（软链到 AI 客户端技能目录）…')
  const skillNames = ['autoshorts', 'comment-funnel', 'viraloop', 'larry-marketing']
  const targets = [join(homedir(), '.trae-cn/skills'), join(homedir(), '.claude/skills')]
  let linked = 0
  for (const t of targets) {
    if (!existsSync(t)) continue
    for (const name of skillNames) {
      const src = join(ROOT, `skills/${name}`)
      const dst = join(t, `dhlinks-${name}`)
      if (!existsSync(src)) continue
      if (existsSync(dst)) { rmSync(dst, { recursive: true, force: true }) }
      try { symlinkSync(src, dst); linked++ }
      catch { try { cpSync(src, dst, { recursive: true }) } catch {} }
    }
  }
  console.log(GREEN(`      ✓ 已安装 ${linked} 个技能（名称带 dhlinks- 前缀，避免与官方冲突）`))
} else {
  step('4', '安装技能', '')
  console.log('      跳过（需技能请运行：node install.js --install-skills）')
}

// [5] 验证
step('5', '运行验证…')
console.log('')
try {
  const r = spawnSync(process.execPath, [join(ROOT, 'verify.js')], { stdio: 'inherit' })
  if (r.status === 0) {
    console.log('\n  ' + GREEN('══ 安装完成 ══'))
    console.log('  下一步：在 mcp/dhlinks-mcp/.env 填好账号密码 → 重启 AI 客户端会话 → 就能说\n' +
      '  「用我的 DHLinks 账号把这段内容发到全部 22 个平台」「看完某个帖子的评论并私信回复」\n')
  } else {
    console.log('\n  ' + YELLOW('══ 验证未全过 — 按上面 FAIL 提示修一下再重跑 node install.js ══'))
  }
  process.exit(r.status ?? 1)
} catch {
  process.exit(1)
}