#!/usr/bin/env bash
set -Eeuo pipefail

# Verify the active VPS release after DNS and HTTPS are configured.
BASE_URL="${1:-https://mindnotespro.l.cd}"
BASE_URL="${BASE_URL%/}"

if [[ "$BASE_URL" == https://* ]]; then
  HTTP_URL="http://${BASE_URL#https://}"
  redirect_headers="$(curl --silent --show-error --max-time 20 --dump-header - --output /dev/null "$HTTP_URL/")"
  grep -Eq '^HTTP/[0-9.]+ (301|302|307|308)' <<<"$redirect_headers" || {
    echo "FAIL HTTP redirect: expected HTTP to redirect to HTTPS" >&2
    exit 1
  }
  grep -Eiq '^location: https://' <<<"$redirect_headers" || {
    echo "FAIL HTTP redirect: Location is not HTTPS" >&2
    exit 1
  }
  echo "OK   HTTP -> HTTPS"
fi

check() {
  local path="$1"
  local expected_cache="$2"
  local headers
  headers="$(curl --fail --silent --show-error --max-time 20 --dump-header - --output /dev/null "$BASE_URL$path")"
  grep -Eq '^HTTP/[0-9.]+ 200' <<<"$headers" || {
    echo "FAIL $path: expected HTTP 200" >&2
    return 1
  }
  if [[ -n "$expected_cache" ]]; then
    grep -Eiq "^cache-control:.*$expected_cache" <<<"$headers" || {
      echo "FAIL $path: expected Cache-Control matching $expected_cache" >&2
      return 1
    }
  fi
  echo "OK   $path"
}

check / 'no-cache'
check /sw.js 'no-cache'
check /manifest.json 'no-cache'
check /icons/icon-192x192.png 'no-cache'

security_headers="$(curl --fail --silent --show-error --max-time 20 --dump-header - --output /dev/null "$BASE_URL/")"
for required_header in \
  'x-content-type-options:[[:space:]]*nosniff' \
  'x-frame-options:[[:space:]]*DENY' \
  'referrer-policy:[[:space:]]*strict-origin-when-cross-origin' \
  'permissions-policy:.*camera=\(\).*microphone=\(\).*geolocation=\(\)' \
  'strict-transport-security:[[:space:]]*max-age=31536000'; do
  grep -Eiq "^$required_header" <<<"$security_headers" || {
    echo "FAIL /: missing required security header matching $required_header" >&2
    exit 1
  }
done
echo 'OK   security headers'

index="$(curl --fail --silent --show-error --location --max-time 20 "$BASE_URL/")"
if grep -q '/mindnotes-pro/' <<<"$index"; then
  echo 'FAIL /: app shell still references the GitHub Pages /mindnotes-pro/ base path' >&2
  exit 1
fi
if ! grep -qE 'src="(/|\./)js/' <<<"$index"; then
  echo 'FAIL /: built app shell does not reference a JS bundle' >&2
  exit 1
fi

asset_path="$(sed -nE 's/.*src="([^"?]+\.js)".*/\1/p' <<<"$index" | head -n 1)"
if [[ -z "$asset_path" ]]; then
  echo 'FAIL /: could not extract the entry JS bundle path' >&2
  exit 1
fi
if [[ "$asset_path" == ./* ]]; then
  asset_path="/${asset_path#./}"
fi
check "$asset_path" 'immutable'

missing_asset_status="$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$BASE_URL/js/__mindnotes_missing__.js")"
if [[ "$missing_asset_status" != 404 ]]; then
  echo "FAIL missing asset: expected HTTP 404, got $missing_asset_status" >&2
  exit 1
fi
echo "OK   missing asset returns 404"

missing_icon_status="$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$BASE_URL/icons/__mindnotes_missing__.png")"
if [[ "$missing_icon_status" != 404 ]]; then
  echo "FAIL missing icon: expected HTTP 404, got $missing_icon_status" >&2
  exit 1
fi
echo "OK   missing icon returns 404"

fallback="$(curl --fail --silent --show-error --location --max-time 20 "$BASE_URL/__mindnotes_deploy_probe__")"
grep -q '<div id="root"></div>' <<<"$fallback" || {
  echo 'FAIL fallback: unknown path did not return the app shell' >&2
  exit 1
}

echo "Deployment checks passed for $BASE_URL"
