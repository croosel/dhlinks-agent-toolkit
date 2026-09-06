#!/bin/bash
# 通过 DHLinks 后端回看已发布内容的互动数据
# Usage: ./check-analytics.sh [days]
#
# Auth: POST https://api.dh-gos.online/api/login (DHLINKS_USERNAME / DHLINKS_PASSWORD)
#       -> token -> GET /api/analytics (平台级：粉丝/互动/播放)
# 更推荐：在 AI 客户端内直接调 dhlinks_analytics / dhlinks_history

set -e

DHLINKS_URL="https://api.dh-gos.online/api"
DHLINKS_USERNAME="${DHLINKS_USERNAME:?Error: DHLINKS_USERNAME is not set}"
DHLINKS_PASSWORD="${DHLINKS_PASSWORD:?Error: DHLINKS_PASSWORD is not set}"
DAYS="${1:-7}"
CAROUSEL_DIR="/tmp/carousel"

echo "═══════════════════════════════════════════════════════════════"
echo "📊 TIKTOK / INSTAGRAM ANALYTICS - Last $DAYS days (DHLinks)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 登录拿 token ──
echo "🔑 Logging into DHLinks backend..."
TOKEN=$(curl -s -X POST "$DHLINKS_URL/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$DHLINKS_USERNAME\",\"password\":\"$DHLINKS_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ DHLinks 登录失败，请检查 DHLINKS_USERNAME / DHLINKS_PASSWORD。"
    exit 1
fi
echo "   ✅ 已登录。"
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. TikTok + Instagram 平台级数据
# GET /api/analytics?platforms=tiktok,instagram
# ═══════════════════════════════════════════════════════════════
echo "📈 平台级数据分析（最近 $DAYS 天）..."
ANALYTICS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$DHLINKS_URL/analytics?platforms=tiktok,instagram")

if echo "$ANALYTICS" | jq -e '.tiktok' >/dev/null 2>&1; then
    echo ""
    echo "🎵 TikTok:"
    echo "$ANALYTICS" | jq -r '.tiktok |
      "   👥 Followers: \(.followers // "N/A")",
      "   👀 Impressions: \(.impressions // "N/A")",
      "   ❤️ Likes: \(.likes // "N/A")",
      "   💬 Comments: \(.comments // "N/A")",
      "   🔄 Shares: \(.shares // "N/A")"
    ' 2>/dev/null
else
    echo "   ⚠️ 暂无 TikTok 数据"
fi

if echo "$ANALYTICS" | jq -e '.instagram' >/dev/null 2>&1; then
    echo ""
    echo "📸 Instagram:"
    echo "$ANALYTICS" | jq -r '.instagram |
      "   👥 Login: \(.login // "N/A")",
      "   👀 Impressions / Reach: \(.impressions // .reach // "N/A")",
      "   ❤️ Likes: \(.likes // "N/A")"
    ' 2>/dev/null
else
    echo "   ⚠️ 暂无 Instagram 数据"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 2. 最近发布内容列表（request id 与帖文 URL）
# GET /api/history
# ═══════════════════════════════════════════════════════════════
echo "🕓 最近发布记录（history）..."
HISTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$DHLINKS_URL/history?page=1&limit=10")

if echo "$HISTORY" | jq -e '.items' >/dev/null 2>&1; then
    echo "$HISTORY" | jq -r '.items[]? |
      "   • \(.published_at // .created_at // "—")  type=\(.type // "?")  \(.status // "")",
      "       request_id: \(.request_id // "—")"
    ' 2>/dev/null || echo "   （无记录）"
else
    echo "   ⚠️ 暂无历史记录"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 3. 保存快照供 learn-from-analytics.js 使用
# ═══════════════════════════════════════════════════════════════
SNAPSHOT_FILE="$CAROUSEL_DIR/analytics-snapshot.json"
echo "{
  \"timestamp\": \"$(date -Iseconds)\",
  \"days\": $DAYS,
  \"analytics\": $ANALYTICS,
  \"history\": $HISTORY
}" > "$SNAPSHOT_FILE" 2>/dev/null || echo "{}" > "$SNAPSHOT_FILE"

echo "💾 Snapshot saved to: $SNAPSHOT_FILE"
echo ""
echo "═══════════════════════════════════════════════════════════════"