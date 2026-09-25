---
title: 併用推奨MOD
description: DQMVIといっしょに入れると便利なMOD（HP表示・ミニマップ・軽量化など）と、入れないほうがいいMODの紹介。
---

# 併用推奨MOD

DQMVIといっしょに入れると便利なMODを紹介します。表の「動いている版」は、DQMVI 0.31.97 と同じ mods フォルダに入れて動いている版です。

::: tip 探すときのコツ
CurseForge や Modrinth で探すときは、Minecraft のバージョンを **26.2**、MODローダーを **NeoForge** に絞り込んでください。

マルチで遊ぶときは、サーバーにも入れる必要があるMODがあります。配布ページの説明を確認してください。
:::

## HP表示 {#hp}

| MOD | できること | 動いている版 |
| --- | --- | --- |
| [Neat](https://www.curseforge.com/minecraft/mc-mods/neat) | 敵やモンスターの頭上に、HPのバーと数値を出します。 | 26.2-50 |

なかまのHP・MPは、DQMVIの頭上表示でも見られます。

## ミニマップ {#minimap}

| MOD | できること | 動いている版 |
| --- | --- | --- |
| [JourneyMap](https://www.curseforge.com/minecraft/mc-mods/journeymap) | 画面の隅にミニマップを出します。全体の地図や、目印（ウェイポイント）も使えます。 | 26.2-6.0.2 |

## 軽量化 {#performance}

| MOD | できること | 動いている版 |
| --- | --- | --- |
| [Lithium](https://www.curseforge.com/minecraft/mc-mods/lithium) | ゲームの内部処理を効率化して、遊び方を変えずに軽くします。 | 0.25.3+mc26.2 |
| [ImmediatelyFast](https://www.curseforge.com/minecraft/mc-mods/immediatelyfast) | 文字やアイコンなどの描画を効率化して、フレームレートを上げます。 | 1.16.2+26.2 |
| [Immersive Optimization](https://www.curseforge.com/minecraft/mc-mods/immersive-optimization) | 遠くのエンティティなどの更新を間引いて、ラグを抑えます。 | 26.2-0.2.0 |
| [XP Stream](https://www.curseforge.com/minecraft/mc-mods/xp-stream) | 経験値オーブの吸い込みを、速くなめらかにします。 | 26.2-1.1.5 |

重くなる原因と対策は、[よくある質問](/guide/faq#setup)の「動作が重い・カクつく」にもまとめています。

## 便利なMOD {#convenience}

| MOD | できること | 動いている版 |
| --- | --- | --- |
| [Mouse Tweaks](https://www.curseforge.com/minecraft/mc-mods/mouse-tweaks) | インベントリのアイテム移動を、ドラッグやホイールで楽にします。 | mc26.2-2.31 |
| [CutAll SMP](https://www.curseforge.com/minecraft/mc-mods/ikkatsuhakai-axe) | 斧で木を切ると、そこから上の幹をまとめて切れます。 | v2.5.3 |
| [MineAll SMP](https://www.curseforge.com/minecraft/mc-mods/break-all-of-the-same-block-and-more) | つるはしで鉱石を掘ると、つながった同じ鉱石をまとめて掘れます。 | v2.6.6 |
| [Effortless Building](https://www.curseforge.com/minecraft/mc-mods/effortless-building) | 壁や床をまとめて置いたり、鏡写しに置いたりして、建築を楽にします。 | 26.2-4.3 |
| [Sophisticated Backpacks](https://www.curseforge.com/minecraft/mc-mods/sophisticated-backpacks) | 持ち歩けるバックパックを追加します。アップグレードで容量や機能を足せます。 | 26.2-3.25.83.2018 |

Sophisticated Backpacks を使うには、前提MODの [Sophisticated Core](https://www.curseforge.com/minecraft/mc-mods/sophisticated-core)（26.2-1.4.90.2199）も必要です。

## 音声パック（公式） {#voice}

DQMVIの公式サイトで、音声パックが配布されています。入れると、ペット・まちの人・クエストに声が付きます。DQMVI本体と同じ mods フォルダに入れるだけです。

→ [DQMⅥ 公式サイト（ダウンロード）](https://dqmvi.kj-apps.com/#download)

## 影MOD {#shaders}

公式サイトの「[影MODについて](https://dqmvi.kj-apps.com/shaders.html)」で、使える組み合わせが案内されています。

| MOD・パック | 役割 | 案内されている版 |
| --- | --- | --- |
| [Iris Shaders](https://www.curseforge.com/minecraft/mc-mods/irisshaders) | シェーダー（影）を読み込むMOD | 1.11.2+mc26.2 |
| [Sodium](https://www.curseforge.com/minecraft/mc-mods/sodium) | Iris Shaders の前提MOD | 0.9.1+mc26.2 |
| Complementary Shaders - Unbound | シェーダーパック | r5.8.1 |
| BSL Shaders | シェーダーパック | v10.1.3 |

シェーダーパックはどちらか1つを選びます。影MODを入れると動作が重くなりやすいので、PCに余裕があるときに試してください。

## 入れないほうがいいMOD {#not-recommended}

### レシピMOD（JEI・REI・EMI など）

DQMVIの画面（GUI）と表示が重なってしまうことがあるため、**導入はおすすめしません。**

DQMVIの武器・防具は、ほぼすべて「鍛冶用モンスターポート」で作ります。レシピは鍛冶ポートの一覧で確認できるので、レシピMODがなくても困りません。

→ [鍛冶](/play/smithing)

## 関連ページ

- [導入方法](/guide/install)
- [よくある質問](/guide/faq)
- [MOD更新履歴](/guide/updates)
