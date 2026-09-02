#!/usr/bin/env bash
set -euo pipefail

if (($# != 3)); then
  echo "用法：collect-release-changes.sh <from_tag> <to_tag> <output_dir>" >&2
  exit 2
fi

normalize_tag() {
  local tag="$1"
  if [[ "$tag" == v* ]]; then
    printf '%s\n' "$tag"
  else
    printf 'v%s\n' "$tag"
  fi
}

from_tag="$(normalize_tag "$1")"
to_tag="$(normalize_tag "$2")"
output_dir="$3"
repository_path="${REPOSITORY_PATH:-.}"

for tag in "$from_tag" "$to_tag"; do
  if ! git check-ref-format --allow-onelevel "$tag" >/dev/null 2>&1; then
    echo "錯誤：Tag 格式無效：$tag" >&2
    exit 1
  fi

  if ! git -C "$repository_path" show-ref --verify --quiet "refs/tags/$tag"; then
    echo "錯誤：Tag 不存在：$tag" >&2
    exit 1
  fi
done

from_commit="$(git -C "$repository_path" rev-parse "refs/tags/$from_tag^{commit}")"
to_commit="$(git -C "$repository_path" rev-parse "refs/tags/$to_tag^{commit}")"

if ! git -C "$repository_path" merge-base --is-ancestor "$from_commit" "$to_commit"; then
  echo "錯誤：From Tag 必須是 To Tag 的 ancestor：$from_tag -> $to_tag" >&2
  exit 1
fi

range="$from_commit..$to_commit"
if git -C "$repository_path" diff --quiet "$range" --; then
  echo "錯誤：$from_tag 與 $to_tag 之間沒有實際變更。" >&2
  exit 1
else
  diff_status=$?
  if ((diff_status != 1)); then
    echo "錯誤：無法讀取 $from_tag 與 $to_tag 之間的 Git Diff。" >&2
    exit "$diff_status"
  fi
fi

if [[ -e "$output_dir" ]]; then
  echo "錯誤：輸出目錄已存在：$output_dir" >&2
  exit 1
fi

output_parent="$(dirname "$output_dir")"
mkdir -p "$output_parent"
temp_dir="$(mktemp -d "$output_parent/.release-changes.XXXXXX")"
cleanup() {
  if [[ -n "${temp_dir:-}" && -d "$temp_dir" ]]; then
    rm -rf -- "$temp_dir"
  fi
}
trap cleanup EXIT

mkdir -p "$temp_dir/diff-fragments"

git -C "$repository_path" log "$range" \
  --no-merges \
  --date=short \
  --pretty=format:'%h%x09%ad%x09%s' > "$temp_dir/commits.txt"
printf '\n' >> "$temp_dir/commits.txt"

git -C "$repository_path" diff \
  --name-status \
  --find-renames \
  "$range" -- > "$temp_dir/changed-files.txt"

git -C "$repository_path" diff --shortstat "$range" -- > "$temp_dir/shortstat.txt"
git -C "$repository_path" diff --numstat "$range" -- > "$temp_dir/numstat.txt"

compare_url=""
if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  compare_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/compare/${from_tag}...${to_tag}"
fi

{
  printf 'FROM_TAG=%s\n' "$from_tag"
  printf 'TO_TAG=%s\n' "$to_tag"
  printf 'FROM_COMMIT=%s\n' "$from_commit"
  printf 'TO_COMMIT=%s\n' "$to_commit"
  printf 'COMPARE_URL=%s\n' "$compare_url"
} > "$temp_dir/metadata.env"

file_count="$(git -C "$repository_path" diff --name-only -z "$range" -- | tr -cd '\0' | wc -c | tr -d ' ')"
read -r additions deletions binary_count < <(
  awk '
    BEGIN { additions = 0; deletions = 0; binaries = 0 }
    $1 == "-" || $2 == "-" { binaries += 1; next }
    { additions += $1; deletions += $2 }
    END { printf "%d %d %d\n", additions, deletions, binaries }
  ' "$temp_dir/numstat.txt"
)

{
  printf -- '- %s 個檔案異動\n' "$file_count"
  printf -- '- 新增 %s 行\n' "$additions"
  printf -- '- 刪除 %s 行\n' "$deletions"
  if ((binary_count > 0)); then
    printf -- '- %s 個 Binary 檔案異動\n' "$binary_count"
  fi
} > "$temp_dir/statistics.md"

is_excluded_path() {
  local path="$1"
  case "$path" in
    bin/*|*/bin/*|obj/*|*/obj/*|node_modules/*|*/node_modules/*|dist/*|*/dist/*|coverage/*|*/coverage/*)
      return 0
      ;;
    *.min.js|*.map|*.Designer.cs|*.generated.cs|package-lock.json|*/package-lock.json|yarn.lock|*/yarn.lock|pnpm-lock.yaml|*/pnpm-lock.yaml)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

fragment_index=0
while IFS= read -r -d '' changed_path; do
  if is_excluded_path "$changed_path"; then
    continue
  fi

  fragment_index=$((fragment_index + 1))
  fragment_path="$temp_dir/diff-fragments/$(printf '%06d' "$fragment_index").patch"
  file_status="$(git -C "$repository_path" diff --name-status --find-renames "$range" -- "$changed_path" | head -n 1)"
  file_numstat="$(git -C "$repository_path" diff --numstat "$range" -- "$changed_path" | head -n 1)"

  if [[ "$file_numstat" == -*$'\t'-*$'\t'* ]]; then
    {
      printf 'Binary 檔案異動（內容不提供給 AI）\n'
      printf '狀態與檔名：%s\n' "$file_status"
    } > "$fragment_path"
  else
    git -C "$repository_path" diff \
      --no-ext-diff \
      --unified=3 \
      "$range" -- "$changed_path" > "$fragment_path"
  fi

  if [[ ! -s "$fragment_path" ]]; then
    rm -f -- "$fragment_path"
    fragment_index=$((fragment_index - 1))
  fi
done < <(git -C "$repository_path" diff --name-only -z --diff-filter=ACDMRTUXB "$range" --)

printf '%s\n' "$fragment_index" > "$temp_dir/fragment-count.txt"
mv -- "$temp_dir" "$output_dir"
temp_dir=""
trap - EXIT

echo "已收集 $from_tag 到 $to_tag 的變更；AI diff fragment：$fragment_index。"
