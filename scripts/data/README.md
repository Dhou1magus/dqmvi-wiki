# scripts/data

`equipment.json` / `monster-extras.json` / `item-sources.json` は **固定データ** です（DQMVI 0.25.84）。
これらを作り直す道具は 2026-09-03 に削除しました。MOD の作者の意向により、MOD本体を解析して
データを取り出すことはしません。新しく作ることも、載せる項目を増やすこともしないでください。

`counts.json` と `name-index.json` は gen-*.mjs が書き出す作業用のファイルです。

`monster-kinds.json` は **手で書くファイル** です。モンスター図鑑の絞り込みボタン（転生・ボス・コインボス）で
どのモンスターを出すかを決めます。書き方はファイルの中の「_説明」を見てください。gen-*.mjs は触りません。
