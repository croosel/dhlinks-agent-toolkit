#!/usr/bin/env node
/**
 * 数据回看 — DHLinks 后端
 * 
 * 拉取平台级数据与发布历史，跟踪每条帖文表现。
 * 
 * 工作原理：
 * 1. 从 DHLinks 后端 GET /api/analytics 拿平台级数据（粉丝/播放/触达）
 * 2. 从 GET /api/history 拿按 request_id 分组的发布结果
 * 3. 按平台统计 views / likes / comments / shares
 * 4. 无需手动关联帖文 ID — DHLinks 按 request_id 自动跟踪
 * 
 * Usage: node check-analytics.js --config <config.json> [--days 3]
 * 
 * --days: 回看过去多少天的发布历史（默认 3）
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const configPath = getArg('config');
const days = parseInt(getArg('days') || '3');

if (!configPath) {
  console.error('Usage: node check-analytics.js --config <config.json> [--days 3]');
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

async function login() {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DHLinks 登录失败 (${res.status}): ${t.substring(0, 200)}`);
  }
  const body = await res.json();
  const token = body.token || body.access_token;
  if (!token) throw new Error('DHLinks 登录响应里没有 token');
  return token;
}

async function api(method, endpoint, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const now = new Date();
  const startDate = new Date(now - days * 86400000);

  console.log(`📊 回看数据（最近 ${days} 天）\n`);

  let token;
  try {
    token = await login();
    console.log('   ✅ 已登录 DHLinks 后端。\n');
  } catch (err) {
    console.log(`  ⚠️ 登录失败: ${err.message}\n`);
    return;
  }

  // ==========================================
  // 1. 平台级数据
  // ==========================================
  console.log('📈 平台数据:\n');

  try {
    const platformsParam = PLATFORMS.join(',');
    const analytics = await api('GET', `/analytics?platforms=${platformsParam}`, token);

    for (const platform of PLATFORMS) {
      const data = analytics[platform] || analytics.platforms?.[platform];
      if (!data) {
        console.log(`  ${platform}: 暂无数据`);
        continue;
      }

      if (data.error || data.message) {
        console.log(`  ${platform}: ${data.error || data.message}`);
        continue;
      }

      console.log(`  📱 ${platform.toUpperCase()}:`);
      if (data.followers !== undefined) console.log(`     Followers: ${data.followers.toLocaleString()}`);
      if (data.impressions !== undefined) console.log(`     Impressions: ${data.impressions.toLocaleString()}`);
      if (data.reach !== undefined) console.log(`     Reach: ${data.reach.toLocaleString()}`);
      if (data.profileViews !== undefined) console.log(`     Profile Views: ${data.profileViews.toLocaleString()}`);
      if (data.likes !== undefined) console.log(`     Likes: ${data.likes.toLocaleString()}`);
      if (data.comments !== undefined) console.log(`     Comments: ${data.comments.toLocaleString()}`);
      console.log('');
    }
  } catch (err) {
    console.log(`  ⚠️ 数据拉取错误: ${err.message}\n`);
  }

  // ==========================================
  // 2. 发布历史（按 request_id）
  // ==========================================
  console.log('📋 发布历史（最近 ' + days + ' 天）:\n');

  const allUploads = [];

  try {
    // DHLinks /api/history → { items: [...] } 或数组；为空即停
    const history = await api('GET', `/history?page=1&limit=50`, token);
    const items = Array.isArray(history) ? history : (history.items || history.history || history.publications || []);

    for (const item of items) {
      const ts = item.published_at || item.created_at || item.upload_timestamp;
      const itemDate = ts ? new Date(ts) : new Date();
      if (itemDate < startDate) continue;
      allUploads.push(item);
    }
  } catch (err) {
    console.log(`  ⚠️ 历史拉取错误: ${err.message}\n`);
  }

  // 按 request_id 分组
  const postsByRequestId = {};
  for (const up of allUploads) {
    const rid = up.request_id || up.id || 'unknown';
    const platformKey = (up.platform || '').toLowerCase();
    if (!postsByRequestId[rid]) {
      postsByRequestId[rid] = {
        requestId: rid,
        caption: up.title || up.post_title || up.post_caption || '',
        uploadDate: up.published_at || up.created_at || up.upload_timestamp,
        platforms: {},
        success: up.success !== false,
      };
    }
    // 单条可能直接带平台数组，也可能按平台展开
    if (platformKey && PLATFORMS.includes(platformKey)) {
      postsByRequestId[rid].platforms[platformKey] = {
        success: up.success !== false,
        postUrl: up.post_url || up.url || null,
        postId: up.platform_post_id || up.post_id || null,
        error: up.error_message || up.error || null,
        mediaType: up.media_type || up.type || null,
      };
      if (up.success === false) postsByRequestId[rid].success = false;
    } else {
      // 平台未细分时按配置里的平台登记占位
      for (const pl of PLATFORMS) {
        if (!postsByRequestId[rid].platforms[pl]) {
          postsByRequestId[rid].platforms[pl] = { success: up.success !== false, postUrl: up.post_url || null };
        }
      }
    }
  }

  const posts = Object.values(postsByRequestId);
  posts.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  console.log(`  共 ${posts.length} 条发布（跨平台条目合计）\n`);

  const results = [];
  for (const post of posts) {
    const date = post.uploadDate ? post.uploadDate.slice(0, 10) : 'unknown';
    const statusIcon = post.success ? '✅' : '❌';
    const platformList = Object.entries(post.platforms)
      .map(([p, info]) => `${p}${info.success ? '✅' : '❌'}`)
      .join(', ');

    console.log(`  ${statusIcon} ${date} | ${post.caption.substring(0, 55)}...`);
    console.log(`     Platforms: ${platformList}`);
    console.log(`     Request ID: ${post.requestId}`);

    for (const [platform, info] of Object.entries(post.platforms)) {
      if (info.postUrl) {
        console.log(`     ${platform}: ${info.postUrl}`);
      }
      if (info.error) {
        console.log(`     ${platform} error: ${info.error}`);
      }
    }
    console.log('');

    results.push({
      requestId: post.requestId,
      date,
      caption: post.caption.substring(0, 70),
      platforms: post.platforms,
      success: post.success,
    });
  }

  // ==========================================
  // 3. 保存数据快照
  // ==========================================
  const baseDir = path.dirname(configPath);
  const analyticsPath = path.join(baseDir, 'analytics-snapshot.json');
  const snapshot = {
    date: now.toISOString(),
    platforms: PLATFORMS,
    posts: results,
    totalPosts: results.length,
    successfulPosts: results.filter(r => r.success).length,
    failedPosts: results.filter(r => !r.success).length,
  };
  fs.writeFileSync(analyticsPath, JSON.stringify(snapshot, null, 2));
  console.log(`💾 已保存数据快照到 ${analyticsPath}`);

  // ==========================================
  // 4. 汇总
  // ==========================================
  console.log('\n📊 汇总:');
  console.log(`  跟踪发布: ${results.length}`);
  console.log(`  成功: ${snapshot.successfulPosts}`);
  console.log(`  失败: ${snapshot.failedPosts}`);

  const platformCounts = {};
  for (const post of results) {
    for (const [platform, info] of Object.entries(post.platforms)) {
      if (!platformCounts[platform]) platformCounts[platform] = { success: 0, failed: 0 };
      if (info.success) platformCounts[platform].success++;
      else platformCounts[platform].failed++;
    }
  }
  for (const [platform, counts] of Object.entries(platformCounts)) {
    console.log(`  ${platform}: ${counts.success} ok, ${counts.failed} failed`);
  }
})();