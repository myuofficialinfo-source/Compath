# CLAUDE.md — Steam Compass プロジェクト指針

このファイルは Claude Code がこのリポジトリで作業する際の永続ルールです。

## Git コミット規約（絶対遵守）

**コミット時の著者は必ず myu アカウントを使用すること。**

- `user.name`: `myuofficialinfo-source`
- `user.email`: `myuofficialinfo@gmail.com`

理由: このリポジトリ ([myuofficialinfo-source/Compath](https://github.com/myuofficialinfo-source/Compath)) は myu アカウント所有のため、コミット履歴も myu に統一する。matsumura アカウント (`matsumura@dank-hearts.com`) でコミットしないこと。

確認方法:
```bash
git config user.name   # → myuofficialinfo-source
git config user.email  # → myuofficialinfo@gmail.com
```

異なる値だったら、コミット前に必ず以下で修正:
```bash
git config user.name "myuofficialinfo-source"
git config user.email "myuofficialinfo@gmail.com"
```
