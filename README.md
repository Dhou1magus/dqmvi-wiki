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

## Google Search Console

1. [Search Console](https://search.google.com/search-console/)で「URLプレフィックス」を選び、`https://dhou1magus.github.io/dqmvi-wiki/` を登録します。
2. 「所有権の確認」→「その他の確認方法」→「HTMLタグ」を選びます。発行されたタグの `content` の値を、`docs/.vitepress/config.mts` の `GOOGLE_SITE_VERIFICATION` に設定します。
3. 変更を公開し、トップページのHTMLソースに `google-site-verification` があることを確かめてから、Search Consoleの「確認」を押します。所有権の維持に使うため、確認後もタグを残します。
4. 「サイトマップ」で `https://dhou1magus.github.io/dqmvi-wiki/sitemap.xml` を送信します。
5. 「URL検査」でトップページのURLを検査し、「インデックス登録をリクエスト」を選びます。

サイトマップはVitePressが生成します。各ページの正規URLも自動設定します。名前だけのアイテムページは検索対象とサイトマップから除外し、本文を追加して再ビルドすると自動で対象に戻ります。

Googleによるクロールには数日から数週間かかる場合があり、登録リクエストは検索掲載を保証するものではありません。詳しくは[Googleの所有権確認手順](https://support.google.com/webmasters/answer/9008080?hl=ja)と[再クロールのリクエスト](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=ja)を参照してください。

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
