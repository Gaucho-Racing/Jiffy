#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<EOF
Usage: $0 <version>

Examples:
  $0 0.1.0
  $0
EOF
}

while getopts ":h" opt; do
    case $opt in
        h) usage; exit 0 ;;
        *) usage; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

INPUT="${1:-}"

for cmd in gh git; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: $cmd is required"
        exit 1
    fi
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
    echo "Error: must be on main branch (currently on $BRANCH)"
    exit 1
fi

git fetch origin main --tags --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "Error: local main is not up to date with origin/main"
    echo "  local:  $LOCAL"
    echo "  remote: $REMOTE"
    exit 1
fi

PREV=$(git tag -l 'v*' | sort -V | tail -n1)

if [[ -z "$INPUT" ]]; then
    echo ""
    if [[ -n "$PREV" ]]; then
        echo "Current release: ${PREV}"
    else
        echo "Current release: (none)"
    fi
    echo ""
    read -rp "Enter new version: " INPUT
fi

if [[ -z "$INPUT" ]]; then
    echo "Error: version cannot be empty"
    exit 1
fi
INPUT="${INPUT#v}"
if [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be a valid semver (e.g. 0.1.0)"
    exit 1
fi
SEMVER="$INPUT"
VERSION="v${INPUT}"
TAG="$VERSION"
IMAGES=("jiffy")

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

if git tag -l "$TAG" | grep -q "^${TAG}$"; then
    echo "Error: tag $TAG already exists"
    exit 1
fi

echo ""
echo "=== Release Summary ==="
echo "  Version: ${VERSION}"
echo "  Tag:     ${TAG}"
echo "  Commit:  $(git rev-parse --short HEAD)"
echo "  Branch:  main"
echo ""
echo "  Files to update:"
echo "    config/config.go"
echo ""
echo "  Docker images that will be tagged:"
for image in "${IMAGES[@]}"; do
    echo "    ghcr.io/gaucho-racing/${image}:${SEMVER}"
done
echo ""
read -rp "Proceed? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

sed -i '' "s/var Version = \".*\"/var Version = \"${SEMVER}\"/" "${REPO_ROOT}/config/config.go"

git add config/config.go
git commit --allow-empty -m "release: jiffy ${VERSION}"
git push origin main

gh release create "$TAG" \
    --target main \
    --title "${VERSION}" \
    --generate-notes

echo ""
echo "Done. ${TAG} released. Workflows will publish images shortly."
