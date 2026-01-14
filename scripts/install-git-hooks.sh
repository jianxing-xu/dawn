#!/bin/bash

# 安装 Git hooks 脚本
# 将 .githooks 中的脚本链接到 .git/hooks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"
GITHOOKS_DIR="$REPO_ROOT/.githooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
  echo "❌ 错误: 未找到 .git/hooks 目录"
  echo "   请确保您在 Git 仓库根目录运行此脚本"
  exit 1
fi

if [ ! -d "$GITHOOKS_DIR" ]; then
  echo "❌ 错误: 未找到 .githooks 目录"
  exit 1
fi

echo "📦 正在安装 Git hooks..."

# 安装 pre-commit hook
if [ -f "$GITHOOKS_DIR/pre-commit" ]; then
  HOOK_PATH="$GIT_HOOKS_DIR/pre-commit"
  if [ -L "$HOOK_PATH" ] || [ -f "$HOOK_PATH" ]; then
    echo "   ⚠️  已存在 pre-commit hook，正在备份..."
    mv "$HOOK_PATH" "$HOOK_PATH.backup.$(date +%Y%m%d_%H%M%S)"
  fi
  
  ln -sf "$GITHOOKS_DIR/pre-commit" "$HOOK_PATH"
  chmod +x "$HOOK_PATH"
  echo "   ✅ pre-commit hook 已安装"
else
  echo "   ⚠️  未找到 pre-commit hook 脚本"
fi

echo ""
echo "✨ Git hooks 安装完成！"
echo ""
echo "现在当您执行 git commit 时，会自动排除以下文件："
echo "  - config/settings_data.json"
echo "  - templates/*.json"
echo "  - sections/*-group.json"
