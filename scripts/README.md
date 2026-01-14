# Scripts 目录

## install-git-hooks.sh

安装 Git hooks 到 `.git/hooks` 目录。

### 使用方法

```bash
bash scripts/install-git-hooks.sh
```

### 功能

- 将 `.githooks/pre-commit` 链接到 `.git/hooks/pre-commit`
- 自动备份已存在的 hook
- 设置正确的执行权限

## 相关文件

- `.githooks/pre-commit` - Pre-commit hook 脚本
- `.githooks/README.md` - Hook 详细说明
