# scripts/data

| ファイル | 中身 | 読む側 |
| --- | --- | --- |
| `equipment-categories.json` | 装備の種類（武器・防具・アクセサリーの分類名と id） | `docs/.vitepress/theme/TopPage.vue` |
| `monster-kinds.json` | 図鑑の絞り込みボタン（転生・ボス・コインボス）に出すモンスター。書き方はファイル内の「_説明」を参照 | `docs/.vitepress/config.mts` |
| `mod-updates.json` | MOD公式サイトの更新履歴の転記 | `scripts/gen-update-pages.mjs` |
| `name-index.json` | トップの検索で引く名前の索引（よくある質問の分は `scripts/gen-faq-index.mjs` が書き出す） | `docs/.vitepress/config.mts` |
