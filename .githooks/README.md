# Git Hooks 说明

## 功能

本目录包含 Git hooks，用于在提交时自动排除特定文件。

## Pre-commit Hook

`pre-commit` hook 会在每次 `git commit` 时自动运行，排除以下文件：

- `config/settings_data.json`
- `templates/*.json`
- `sections/*-group.json`

这些文件对应 `.github/workflows/sync-branches.yml` 中的 `paths-ignore` 配置，应该在各商店分支（如 `de-main`, `us-main`）中独立管理。

## 安装

运行安装脚本：

```bash
bash scripts/install-git-hooks.sh
```

或者手动安装：

```bash
ln -sf .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 工作原理

1. 当您执行 `git commit` 时，hook 会自动检查暂存区
2. 如果发现上述文件被暂存，会自动将它们从暂存区移除
3. 提交会继续执行，但不会包含这些文件
4. 您会看到提示信息，告知哪些文件被排除了

## 示例

```bash
# 修改了代码文件和 settings_data.json
git add .
git commit -m "feat: add new feature"

# Hook 会自动输出：
# ⚠️  检测到以下文件在 paths-ignore 列表中，已自动从提交中排除：
#    - config/settings_data.json
# 💡 提示: 这些文件应该在各商店分支中独立管理
```

## 注意事项

- Hook 不会删除文件，只是从暂存区移除
- 如果确实需要提交这些文件，可以使用 `git commit --no-verify` 跳过 hook
- 这些文件应该在对应的商店分支中单独提交和管理
