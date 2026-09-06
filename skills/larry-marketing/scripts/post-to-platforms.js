#!/usr/bin/env node
/**
 * 通过 DHLinks 后端把轮播图文一键发布到 TikTok + Instagram（以及配置里的其它平台）。
 * 
 * Usage: node post-to-platforms.js --config <config.json> --dir <slides-dir> --caption "文字" [--title "标题"]
 * 
 * 先登录 https://api.dh-gos.online/api/login（DHLINKS_USERNAME / DHLINKS_PASSWORD）拿 token，
 * 再 POST /api/publish（type=photos，mediaBase64 数组）。
 *
 * 返回的 request_id 存进 meta.json，供回看数据用。DHLinks 按 request_id 自动跟踪帖文，无需手动关联。
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const configPath = getArg('config');
const dir = getArg('dir');
const caption = getArg('caption');
const title = getArg('title') || '';

if (!configPath || !dir || !caption) {
  console.error('Usage: node post-to-platforms.js --config <config.json> --dir <dir> --caption "text" [--title "text"]');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const BASE_URL = process.env.DHLINKS_BASE || 'https://api.dh-gos.online/api';
const USERNAME = process.env.DHLINKS_USERNAME || config.dhlinks?.username;
const PASSWORD = process.env.DHLINKS_PASSWORD || config.dhlinks?.password;
const PLATFORMS = config.dhlinks?.platforms || ['tiktok', 'instagram'];

if (!USERNAME || !PASSWORD) {
  console.error('❌ 缺少 DHLinks 凭证：请用 DHLINKS_USERNAME / DHLINKS_PASSWORD（环境变量）或 config.json 的 dhlinks.username / dhlinks.password');
  process.exit(1);
}

// 发布会直接上到公开feed且在本脚本内无法撤消，所以确认放在代码边界，而不是依赖工作流约定。
// 幻灯片经人工/AI 审阅批准后，再传 --confirm-public。
const confirmPublic = args.includes('--confirm-public')
  || process.env.LARRY_CONFIRM_PUBLIC === 'yes';
if (!confirmPublic) {
  console.error(`❌ 未确认，拒绝公开发布到 ${PLATFORMS.join(', ')}。`);
  console.error('   这会发到你的 DHLinks 账号对应当前 profile 的实时 feed。');
  console.error('   幻灯片批准后用 --confirm-public 重跑。');
  process.exit(1);
}

(async () => {
  // 找目录里的轮播图（slide1.png … slideN.png 或 slide1.jpg … slideN.jpg）
  const slideFiles = [];
  for (let i = 1; i <= 35; i++) {
    const pngPath = path.join(dir, `slide${i}.png`);
    const jpgPath = path.join(dir, `slide${i}.jpg`);
    if (fs.existsSync(pngPath)) {
      slideFiles.push(pngPath);
    } else if (fs.existsSync(jpgPath)) {
      slideFiles.push(jpgPath);
    } else {
      break; // 到第一张缺失的图就停
    }
  }

  if (slideFiles.length === 0) {
    console.error('❌ 目录里没有轮播图：', dir);
    console.error('   期望 slide1.png, slide2.png, ... 或 slide1.jpg, slide2.jpg, ...');
    process.exit(1);
  }

  console.log(`📤 正在把 ${slideFiles.length} 张图发布到 ${PLATFORMS.join(' + ')}...`);
  console.log(`   Caption: ${caption.substring(0, 60)}...`);
  if (title) console.log(`   Title: ${title}`);

  // 登录拿 token
  console.log('\n🔑 登录 DHLinks 后端...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    const t = await loginRes.text();
    console.error(`❌ DHLinks 登录失败（HTTP ${loginRes.status}）：`, t.substring(0, 300));
    process.exit(1);
  }
  const loginBody = await loginRes.json();
  const token = loginBody.token || loginBody.access_token;
  if (!token) {
    console.error('❌ DHLinks 登录响应里没有 token');
    process.exit(1);
  }
  console.log('   ✅ 已登录。');

  // 每张图 base64
  const mediaBase64 = slideFiles.map((f) => {
    const b64 = fs.readFileSync(f).toString('base64');
    console.log(`   📎 ${path.basename(f)}`);
    return b64;
  });

  // 组装请求体
  const payload = {
    platforms: PLATFORMS,
    type: 'photos',
    title: caption,
    mediaBase64,
    mode: 'now',
  };
  if (title) payload.title = `${title}\n${caption}`;

  console.log('\n📱 正在发给 DHLinks 后端（POST /api/publish）...');
  try {
    const res = await fetch(`${BASE_URL}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error(`❌ 非 JSON 响应（HTTP ${res.status}）：`, responseText.substring(0, 500));
      process.exit(1);
    }

    if (!res.ok) {
      console.error(`❌ 发布失败（HTTP ${res.status}）：`, JSON.stringify(result, null, 2));
      process.exit(1);
    }

    const requestId = result.request_id || result.requestId || result.id || null;

    console.log('✅ 发布已提交！');
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Platforms: ${PLATFORMS.join(', ')}`);
    if (result.message) console.log(`   Message: ${result.message}`);

    // 保存 meta 供回看数据
    const metaPath = path.join(dir, 'meta.json');
    const meta = {
      requestId,
      caption,
      title,
      platforms: PLATFORMS,
      postedAt: new Date().toISOString(),
      slides: slideFiles.length,
      mode: 'now',
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`📋 已保存元数据到 ${metaPath}`);

    if (requestId) {
      console.log(`\n💡 回看数据可调 dhlinks_history 或 GET "${BASE_URL}/history"`);
    }
  } catch (err) {
    console.error('❌ 网络错误：', err.message);
    process.exit(1);
  }
})();