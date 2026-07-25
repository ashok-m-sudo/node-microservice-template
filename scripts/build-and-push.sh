#!/usr/bin/env bash
set -euo pipefail

REGISTRY="ghcr.io"
SERVICES=(api-gateway auth-service backend-service)
VERSION="latest"
USERNAME=""

usage() {
    echo "Usage: $0 --username <github-username> [--version <version>]"
    echo ""
    echo "  --username   GitHub username or org that owns the GHCR packages (required)"
    echo "  --version    Semantic version tag to push alongside 'latest' (default: latest only)"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$USERNAME" ]]; then
    echo "Error: --username is required"
    usage
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

for service in "${SERVICES[@]}"; do
    IMAGE="${REGISTRY}/${USERNAME}/${service}"
    CONTEXT="${ROOT_DIR}/${service}"

    echo "==> Building ${IMAGE}:${VERSION}"
    docker build -t "${IMAGE}:${VERSION}" "$CONTEXT"

    if [[ "$VERSION" != "latest" ]]; then
        docker tag "${IMAGE}:${VERSION}" "${IMAGE}:latest"
    fi

    echo "==> Pushing ${IMAGE}:${VERSION}"
    docker push "${IMAGE}:${VERSION}"

    if [[ "$VERSION" != "latest" ]]; then
        echo "==> Pushing ${IMAGE}:latest"
        docker push "${IMAGE}:latest"
    fi
done

echo "Done. Pushed: ${SERVICES[*]}"
