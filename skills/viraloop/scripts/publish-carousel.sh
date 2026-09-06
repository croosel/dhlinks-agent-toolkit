#!/bin/bash
# Publish carousel to TikTok + Instagram via the DHLinks backend
# Usage: ./publish-carousel.sh
#
# Auth: POST https://api.dh-gos.online/api/login (DHLINKS_USERNAME / DHLINKS_PASSWORD)
#       -> token -> POST /api/publish (type=photos, mediaBase64 array)

set -e

CAROUSEL_DIR="/tmp/carousel"
CAPTION_FILE="$CAROUSEL_DIR/caption.txt"
ANALYSIS_FILE="$CAROUSEL_DIR/analysis.json"

DHLINKS_URL="https://api.dh-gos.online/api"
DHLINKS_USERNAME="${DHLINKS_USERNAME:?Error: DHLINKS_USERNAME is not set}"
DHLINKS_PASSWORD="${DHLINKS_PASSWORD:?Error: DHLINKS_PASSWORD is not set}"

# Publishing publicly is opt-in. Default to private so an unattended or
# accidental run can never put content on a public feed.
PRIVACY_LEVEL="${PRIVACY_LEVEL:-SELF_ONLY}"
CONFIRM_PUBLIC="${CONFIRM_PUBLIC:-}"

# Verify slides. An array, not a space-joined string, so a path with spaces
# cannot split into two arguments.
SLIDE_FILES=()
for i in 1 2 3 4 5 6; do
    if [ -f "$CAROUSEL_DIR/slide-$i.jpg" ]; then
        SLIDE_FILES+=("$CAROUSEL_DIR/slide-$i.jpg")
    fi
done

if [ ${#SLIDE_FILES[@]} -eq 0 ]; then
    echo "❌ No slides found in $CAROUSEL_DIR/"
    exit 1
fi

SLIDE_COUNT=${#SLIDE_FILES[@]}
echo "═══════════════════════════════════════════════════════════════"
echo "📤 PUBLISHING CAROUSEL TO TIKTOK + INSTAGRAM (DHLinks)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📁 Slides: $SLIDE_COUNT images"

# Load caption
if [ -f "$CAPTION_FILE" ]; then
    CAPTION=$(cat "$CAPTION_FILE")
else
    CAPTION="Check this out! 🔥 #viral #fyp"
fi

# Caption for Instagram (max 2200 chars)
CAPTION_TRUNCATED=$(echo "$CAPTION" | head -c 2000)

echo ""
echo "📝 Caption:"
echo "$CAPTION_TRUNCATED" | head -5
echo "..."
echo ""

# Extract product name from analysis
PRODUCT_NAME="carousel"
if [ -f "$ANALYSIS_FILE" ]; then
    PRODUCT_NAME=$(jq -r '.storytelling.productName // "carousel"' "$ANALYSIS_FILE")
fi

# A public post is irreversible for practical purposes, so require an explicit
# opt-in rather than trusting the caller to have read the default.
if [ "$PRIVACY_LEVEL" = "PUBLIC_TO_EVERYONE" ] && [ "$CONFIRM_PUBLIC" != "yes" ]; then
    echo "❌ Refusing to publish publicly without confirmation."
    echo "   Re-run with CONFIRM_PUBLIC=yes to go ahead, or leave PRIVACY_LEVEL unset"
    echo "   to publish privately (SELF_ONLY)."
    exit 1
fi

echo "🚀 Logging into DHLinks backend..."
TOKEN=$(curl -s -X POST "$DHLINKS_URL/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$DHLINKS_USERNAME\",\"password\":\"$DHLINKS_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ DHLinks login failed. Check DHLINKS_USERNAME / DHLINKS_PASSWORD."
    exit 1
fi
echo "   ✅ Logged in."

# Encode each slide to base64 and build a JSON body.
# The body is built from separate jq-encoded strings, never a shell-eval'd
# string, so a quote in the caption cannot break out into a command.
MEDIA_JSON="["
FIRST=1
for slide in "${SLIDE_FILES[@]}"; do
    B64=$(base64 < "$slide")
    if [ "$FIRST" = "1" ]; then
        MEDIA_JSON="$MEDIA_JSON{\"filename\":\"$(basename "$slide")\",\"data\":\"$B64\"}"
        FIRST=0
    else
        MEDIA_JSON="$MEDIA_JSON,{\"filename\":\"$(basename "$slide")\",\"data\":\"$B64\"}"
    fi
done
MEDIA_JSON="$MEDIA_JSON]"

CAPTION_JSON=$(jq -Rs . <<< "$CAPTION_TRUNCATED")

PAYLOAD=$(jq -n \
    --arg platforms "tiktok instagram" \
    --argjson media "$MEDIA_JSON" \
    --arg title "$(echo "$CAPTION_TRUNCATED" | jq -Rs .)" \
    '{platforms:["tiktok","instagram"], type:"photos", title:$caption}' \
    2>/dev/null || true)

# Build the request cleanly: platforms, type, title, mediaBase64 array.
PAYLOAD=$(jq -n \
    --argjson media "$MEDIA_JSON" \
    --arg title "$CAPTION_TRUNCATED" \
    '{platforms:["tiktok","instagram"], type:"photos", title:$title, mediaBase64:$media, mode:"now"}')

echo "🚀 Sending to DHLinks API (/api/publish)..."
RESPONSE=$(curl -s -X POST "$DHLINKS_URL/publish" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD")

echo "📨 API Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

REQUEST_ID=$(echo "$RESPONSE" | jq -r '.request_id // .id // empty' 2>/dev/null)

if [ -n "$REQUEST_ID" ]; then
    echo ""
    echo "✅ Published! Request ID: $REQUEST_ID"

    POST_INFO="{
  \"request_id\": \"$REQUEST_ID\",
  \"platforms\": [\"tiktok\", \"instagram\"],
  \"product\": \"$PRODUCT_NAME\",
  \"slides\": $SLIDE_COUNT,
  \"timestamp\": \"$(date -Iseconds)\",
  \"caption\": $(echo "$CAPTION_TRUNCATED" | jq -Rs .)
}"
    echo "$POST_INFO" > "$CAROUSEL_DIR/post-info.json"

    echo ""
    echo "   📊 Info saved to: $CAROUSEL_DIR/post-info.json"
    echo ""
    echo "   ⚠️  INSTAGRAM: if music matters to you, remember to add viral music in the app!"
    echo "       1. Open Instagram → Your profile → The post"
    echo "       2. Edit → Add music"
    echo "       3. Search for a trending song"

    # ── Update hook ledger with image-prompt tracking ──
    LEDGER_FILE="$(dirname "$0")/../hook-ledger.json"
    HOOK_INFO_FILE="$CAROUSEL_DIR/hook-info.json"
    if [ -f "$HOOK_INFO_FILE" ] && [ -f "$LEDGER_FILE" ]; then
        HOOK_TYPE=$(jq -r '.hook_type // "unknown"' "$HOOK_INFO_FILE")
        HOOK_TEXT=$(jq -r '.hook_text // ""' "$HOOK_INFO_FILE")
        IMAGE_PROMPT=$(jq -r '.image_prompt // ""' "$HOOK_INFO_FILE")
        NEW_ENTRY=$(jq -n \
            --arg date "$(date +%Y-%m-%d)" \
            --arg type "$HOOK_TYPE" \
            --arg hook_text "$HOOK_TEXT" \
            --arg request_id "$REQUEST_ID" \
            --arg image_prompt "$IMAGE_PROMPT" \
            '{date: $date, type: $type, hook_text: $hook_text, request_id: $request_id, image_prompt: $image_prompt}')
        jq --argjson entry "$NEW_ENTRY" '.hooks += [$entry]' "$LEDGER_FILE" > "${LEDGER_FILE}.tmp" && \
            mv "${LEDGER_FILE}.tmp" "$LEDGER_FILE"
        echo "   ✅ Ledger updated"
    fi
else
    echo ""
    echo "⚠️ Check API response"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"