#!/usr/bin/env bash
set -euo pipefail

if (($# != 2)); then
  echo "用法：update-release.sh <to_tag> <release_notes_file>" >&2
  exit 2
fi

to_tag="$1"
release_notes_file="$2"
start_marker='<!-- AUTO-RELEASE-NOTES-START -->'
end_marker='<!-- AUTO-RELEASE-NOTES-END -->'

if [[ ! -s "$release_notes_file" ]]; then
  echo "錯誤：Release Notes 不存在或為空：$release_notes_file" >&2
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "錯誤：找不到 GitHub CLI。" >&2
  exit 1
fi

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/update-release.XXXXXX")"
cleanup() {
  if [[ -n "${temp_dir:-}" && -d "$temp_dir" ]]; then
    rm -rf -- "$temp_dir"
  fi
}
trap cleanup EXIT

existing_body_file="$temp_dir/existing.md"
merged_body_file="$temp_dir/merged.md"
release_exists=false
if gh release view "$to_tag" --json body --jq '.body' > "$existing_body_file" 2>/dev/null; then
  release_exists=true
else
  : > "$existing_body_file"
fi

start_count="$(grep -Fxc "$start_marker" "$existing_body_file" || true)"
end_count="$(grep -Fxc "$end_marker" "$existing_body_file" || true)"
if ! { [[ "$start_count" == "0" && "$end_count" == "0" ]] || [[ "$start_count" == "1" && "$end_count" == "1" ]]; }; then
  echo "錯誤：既有 Release 的自動內容 marker 不完整或重複，拒絕修改。" >&2
  exit 1
fi

if [[ "$start_count" == "1" ]]; then
  start_line="$(grep -Fn "$start_marker" "$existing_body_file" | cut -d: -f1)"
  end_line="$(grep -Fn "$end_marker" "$existing_body_file" | cut -d: -f1)"
  if ((start_line >= end_line)); then
    echo "錯誤：既有 Release 的自動內容 marker 順序無效，拒絕修改。" >&2
    exit 1
  fi

  awk \
    -v start_marker="$start_marker" \
    -v end_marker="$end_marker" \
    -v notes_file="$release_notes_file" '
      $0 == start_marker {
        print start_marker
        while ((getline line < notes_file) > 0) print line
        close(notes_file)
        print end_marker
        replacing = 1
        next
      }
      replacing && $0 == end_marker {
        replacing = 0
        next
      }
      !replacing { print }
    ' "$existing_body_file" > "$merged_body_file"
else
  cat "$existing_body_file" > "$merged_body_file"
  if [[ -s "$existing_body_file" ]]; then
    printf '\n' >> "$merged_body_file"
  fi
  {
    printf '%s\n\n' "$start_marker"
    cat "$release_notes_file"
    printf '\n%s\n' "$end_marker"
  } >> "$merged_body_file"
fi

if [[ "$release_exists" == true ]]; then
  gh release edit "$to_tag" --notes-file "$merged_body_file"
  echo "已更新 $to_tag Release 的自動 Release Notes 區段。"
else
  gh release create "$to_tag" \
    --verify-tag \
    --title "$to_tag" \
    --notes-file "$merged_body_file"
  echo "已使用既有 Tag 建立 $to_tag Release。"
fi
