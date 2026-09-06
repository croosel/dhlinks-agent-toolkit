# Analytics & Feedback Loop

## Performance Tracking

### DHLinks 后端接口

DHLinks 按 request_id 自动跟踪每条帖文，无需手动关联帖文 ID。

**登录拿 token**（所有请求都要带 `Authorization: Bearer {token}`）：
```
POST https://api.dh-gos.online/api/login
{ "username": "你的DHLinks用户名", "password": "你的DHLinks密码" }
```

**平台级数据**（粉丝 / 触达 / 播放 / 主页浏览）：
```
GET https://api.dh-gos.online/api/analytics?platforms=tiktok,instagram
```

响应（顶层按平台键）：
```json
{
  "tiktok": {
    "followers": 1071,
    "reach": 0,
    "impressions": 6522,
    "profileViews": 0,
    "reach_timeseries": [
      { "date": "2026-02-11", "value": 773 },
      { "date": "2026-02-12", "value": 190 }
    ]
  },
  "instagram": {
    "followers": 523,
    "impressions": 12500,
    "profileViews": 89,
    "reach": 8700,
    "reach_timeseries": [...]
  }
}
```

**发布历史**（按 request_id 的每条发布结果与帖文 URL）：
```
GET https://api.dh-gos.online/api/history?page=1&limit=50
```

响应（items 数组，每条含平台 / 成功状态 / 帖文 URL / request_id）：
```json
{
  "items": [
    {
      "platform": "tiktok",
      "media_type": "image",
      "published_at": "2026-02-15T14:30:00Z",
      "success": true,
      "platform_post_id": "7605531854921354518",
      "post_url": "https://www.tiktok.com/@user/video/7605531854921354518",
      "post_title": "Caption text...",
      "request_id": "abc123def456"
    }
  ]
}
```

也可以直接在 AI 客户端里调 `dhlinks_analytics`（platforms 数组）与 `dhlinks_history`，免去手动 curl。

### Key Difference（按 request_id 自动跟踪）

DHLinks 自动按 `request_id` 跟踪每条发布：
- 发布时 `POST /api/publish` 返回一个 `request_id`
- 历史接口回传该 `request_id`、各平台帖文 ID、帖文 URL
- 数据在平台级统计（粉丝、播放、触达）
- 无需任何手动关联帖文 ID 的步骤

### RevenueCat Integration (Optional)

If the user has RevenueCat, track conversions from TikTok:
- Downloads → Trial starts → Paid conversions
- UTM parameters in App Store link
- Compare conversion spikes with post timing

## The Feedback Loop

### After Every Post (24h)
Record in `hook-performance.json`:
```json
{
  "hooks": [
    {
      "requestId": "abc123def456",
      "text": "boyfriend said flat looks like catalogue",
      "date": "2026-02-15",
      "platforms": {
        "tiktok": { "success": true, "postUrl": "..." },
        "instagram": { "success": true, "postUrl": "..." }
      },
      "conversions": 4,
      "cta": "Download App — link in bio",
      "lastChecked": "2026-02-16"
    }
  ]
}
```

### Weekly Review
1. Check platform analytics deltas (impressions, followers growth)
2. Review upload history for successes/failures
3. Identify top hooks by conversion rate (if RevenueCat connected)
4. Check if any hook CATEGORY consistently wins
5. Update prompt templates with learnings

### Decision Rules (based on platform impressions + conversions)

| Impressions Trend | Action |
|-------|--------|
| Growing (5K+/day) | DOUBLE DOWN — make 3 variations immediately |
| Steady (1K-5K/day) | Good — keep in rotation, test tweaks |
| Declining (<1K/day) | Try radically different approach |

### What to Vary When Iterating
- **Same hook, different person:** "landlord" → "mum" → "boyfriend"
- **Same structure, different room/feature:** bedroom → kitchen → bathroom
- **Same images, different text:** proven images can be reused with new hooks
- **Same hook, different time:** morning vs evening posting

## Conversion Tracking

### Funnel
```
Views → Profile Visits → Link Clicks → App Store → Download → Trial → Paid
```

### Benchmarks
- 1% conversion (views → download) = average
- 1.5-3% = good
- 3%+ = great

### Attribution Tips
- Track download spikes within 24h of viral post
- Use unique UTM links per campaign if possible
- RevenueCat `$attribution` for source tracking
- Compare weekly MRR growth with weekly view totals

## Daily Analytics Cron

Set up a cron job to run every morning before the first post (e.g. 7:00 AM user's timezone):

```
Task: node scripts/daily-report.js --config tiktok-marketing/config.json --days 3
Output: tiktok-marketing/reports/YYYY-MM-DD.md
```

The daily report:
1. Fetches platform analytics from DHLinks (impressions, followers, reach timeseries)
2. Fetches upload history for the last N days (per-post success/failure, post URLs)
3. If RevenueCat is connected, pulls conversion events (trials, purchases) in the same window
4. Cross-references: maps conversion timestamps to post upload times (24-72h attribution window)
5. Applies the diagnostic framework:
   - High views + High conversions → SCALE (make variations)
   - High views + Low conversions → FIX CTA (hook works, downstream is broken)
   - Low views + High conversions → FIX HOOKS (content converts, needs more eyeballs)
   - Low views + Low conversions → FULL RESET (try radically different approach)
6. Suggests new hooks based on what's working
7. Updates `hook-performance.json` with latest data
8. Messages the user with a summary

### Why 3 Days?
- TikTok posts peak at 24-48 hours (not instant like Twitter)
- Conversion attribution takes up to 72 hours (user sees post → downloads → trials → pays)
- 3-day window captures the full lifecycle of each post

### Multi-Platform Advantage
DHLinks 一键发布到 TikTok + Instagram（以及账号里配置的其它平台）。数据接口按平台返回，
可横向对比各平台表现，找出你的内容在哪最受欢迎。
