#!/usr/bin/env node
/**
 * DHLinks 安装包品牌暴露扫描器
 *
 * 用法：
 *   node scripts/scan-brand.js            # 扫描本安装包（dhlinks-agent-toolkit/）
 *   node scripts/scan-brand.js <目录>     # 扫描任意目录
 *   node scripts/scan-brand.js --allow-upload-dummies   # 允许 upload.mp4/upload.jpg 文件名占位符
 *
 * 判定规则：
 *  - 命中供应商品牌串（upload-post / upload.post / uploadpost / UPLOAD_POST / upload_post
 *    / upload-post.com / api.upload-post）→ 记录为 FAIL（exit 1）
 *  - 文件名 upload.mp4 / upload.jpg 属媒体占位符（非品牌），默认放行
 *  - 排除 node_modules、.git、package-lock.json、.env（客户凭证，本就不该进包）
 */
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const args = process.argv.slice(2)
const ALLOW_DUMMIES = args.includes('--allow-upload-dummies')
const ROOT = args.find((a) => !a.startsWith('--')) ?? process.cwd()

const BRAND_PATTERNS = [
  { name: 'upload-post(域名/品牌官方写法)', re: /upload[-_.]post/i },
  { name: 'upload.post.com 域名', re: /upload\.post\.com/i },
  { name: 'upload.post(大小写变体)', re: /upload\s*\.\s*post/i },
  { name: 'UPLOAD_POST 环境变量名', re: /UPLOAD[_\- ]POST/i },
]

const SKIP_DIRS = new Set(['node_modules', '.git', '.idea', '.vscode', 'data', '.DS_Store'])
const SKIP_FILES = new Set(['package-lock.json', '.env', 'scan-brand.js'])

/** 白名单：媒体文件名占位符（非品牌；仅在文件*内容*中出现时放行） */
const DUMMY_RE = /upload\.(mp4|jpg|jpeg|png|mov)/i

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (!SKIP_FILES.has(name) && !name.startsWith('.env')) out.push(p)
  }
  return out
}

function scanDir(dir) {
  const files = walk(dir)
  const hits = []
  let scanned = 0
  for (const f of files) {
    let content
    try {
      content = readFileSync(f, 'utf8')
    } catch {
      continue // 二进制文件跳过
    }
    scanned++
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 文件名占位符放行
      if (DUMMY_RE.test(line) && ALLOW_DUMMIES) continue
      for (const pat of BRAND_PATTERNS) {
        if (pat.re.test(line)) {
          hits.push({ file: f, line: i + 1, pat: pat.name, text: line.trim().slice(0, 120) })
          break
        }
      }
    }
  }
  return { files, scanned, hits }
}

const result = scanDir(ROOT)

console.log(`\n[DHLinks 品牌暴露扫描] 目录 ${ROOT}`)
console.log(`共扫描文件：${result.scanned}`)
if (result.hits.length === 0) {
  console.log('\n✅ PASS：零品牌暴露，可以交付。\n')
  process.exit(0)
}
console.log(`\n❌ FAIL：发现 ${result.hits.length} 处品牌暴露：\n`)
for (const h of result.hits) {
  console.log(`  ${relative(ROOT, h.file)}:${h.line}  [${h.pat}]`)
  console.log(`      ${h.text}`)
}
process.exit(1)