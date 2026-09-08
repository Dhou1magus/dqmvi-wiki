# DQMVI 攻略wiki

Minecraft ドラクエMOD「DQMVI」の攻略wiki。VitePress製・GitHub Pages公開。

## セットアップ

```bash
npm install
npm run docs:dev      # http://localhost:5173 で確認
```

## 公開前に必ず書き換える

| ファイル | 箇所 |
| --- | --- |
| `docs/.vitepress/config.mts` | 先頭の `GITHUB_USER` と `REPO_NAME` |
| `.github/CODEOWNERS` | `@YOUR-GITHUB-NAME` を自分のユーザー名に |

独自ドメインを使う場合は `config.mts` の `base` を `'/'` に変更します。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run docs:dev` | ローカルで確認（保存すると即反映） |
| `npm run docs:build` | 本番ビルド |
| `npm run docs:preview` | ビルド結果を確認 |
| `npm run check` | セキュリティ検査（PR時とデプロイ時に自動でも走る） |

## 公開

`main` に取り込まれると GitHub Actions が自動でビルドして公開します。
初回のみ、Settings → Pages → Source を **GitHub Actions** に変更してください。

## セキュリティ

- 本文の生HTMLは無効（`markdown.html: false`）。記事に書かれたスクリプトは実行されません
- PRごとに `scripts/security-lint.mjs` が危険な記述を検出します
- `main` への直接pushは禁止し、オーナー承認を経て公開する運用を想定しています
- 詳細は [.github/SECURITY.md](.github/SECURITY.md)

**この設定を緩めないでください。** 特に `markdown.html` を `true` に戻すと、編集権限を持つ全員が
サイト訪問者のブラウザで任意のコードを実行できるようになります。

## バックアップ

| 層 | 使い方 |
| --- | --- |
| ページ単位の履歴 | 各ページ下の「このページの変更履歴・復元」 |
| 週次の自動保管 | Actions → Backup → 実行結果の Artifacts（90日保持） |
| 手元コピー | `git clone --mirror <リポジトリURL>` |

## ページの追加

`docs/` 配下に `.md` ファイルを置くだけで公開されます。
サイドバーに載せる場合は `docs/.vitepress/config.mts` の `sidebar` に追記します。

編集ルールと書き方は [docs/guide/edit.md](docs/guide/edit.md) を参照。
