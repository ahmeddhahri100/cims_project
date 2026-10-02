#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SARIF_OUTPUT="${PROJECT_ROOT}/semgrep.sarif"

echo "Starting SAST scan with Semgrep..."

if ! command -v semgrep &> /dev/null; then
    echo "Semgrep not found. Running via Docker..."
    docker run --rm \
        -v "${PROJECT_ROOT}:/src" \
        returntocorp/semgrep:latest semgrep scan \
        --config=/src/.semgrep.yml \
        --sarif \
        --output=/src/semgrep.sarif \
        --verbose \
        /src
else
    semgrep scan \
        --config="${PROJECT_ROOT}/.semgrep.yml" \
        --sarif \
        --output="${SARIF_OUTPUT}" \
        --verbose \
        "${PROJECT_ROOT}"
fi

if [ -f "${SARIF_OUTPUT}" ]; then
    echo "SARIF report generated successfully at: ${SARIF_OUTPUT}"
    echo ""
    echo "To view the report locally:"
    echo "1. Install VS Code SARIF Viewer extension"
    echo "2. Open ${SARIF_OUTPUT} in VS Code"
    echo "3. Or upload to GitHub -> Security -> Code Scanning"
    exit 0
else
    echo "Error: SARIF report was not generated"
    exit 1
fi
