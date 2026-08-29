<script setup>
import { useData, withBase } from 'vitepress'

const { frontmatter } = useData()

// ───────────────────────────────────────────────────────────
//  トップページの中身。ここを書き換えると表示が変わる。
//  link を書けばリンクに、書かなければ「未作成」の灰色表示になる。
// ───────────────────────────────────────────────────────────
const meta = [
  { label: '対応バージョン', value: 'DQMVI 0.25.41' },
  { label: '最終更新', value: '2026-08-29' },
  { label: 'ページ数', value: '603' },
  { label: '編集者', value: '募集中' }
]

const start = [
  { n: 'FIRST', t: 'DQMVIとは', d: 'どんなMODなのか、何が追加されるのか', link: '/guide/what-is-dqmvi' },
  { n: 'SETUP', t: '導入方法', d: '前提MOD・推奨環境・つまずきポイント', link: '/guide/install' },
  { n: 'HELP', t: 'よくある質問', d: '起動しない・湧かない・落ちるとき', link: '/guide/faq' },
  { n: 'JOIN', t: '編集のしかた', d: 'ブラウザだけで参加できます', link: '/guide/edit' }
]

const cats = [
  {
    title: '攻略チャート',
    items: [
      { t: '序盤の進め方' }, { t: '中盤の進め方' }, { t: '終盤の進め方' },
      { t: 'やり込み要素' }, { t: 'レベル上げ' }, { t: '金策' }
    ]
  },
  {
    title: 'モンスター',
    items: [
      { t: 'モンスター図鑑 579体', link: '/monsters/', wide: true },
      { t: '魔王・ボス 17体', link: '/bosses/', wide: true },
      { t: 'ドロップ品' }, { t: '出現場所' }, { t: '系統別' }
    ]
  },
  {
    title: 'なかまモンスター',
    items: [
      { t: '仲間にする方法' }, { t: '配合' }, { t: 'なつき度' },
      { t: 'おすすめ編成' }, { t: 'こころ一覧' }
    ]
  },
  {
    title: '職業・特技',
    items: [
      { t: '職業一覧', link: '/jobs/', wide: true },
      { t: '転職のしかた' }, { t: '熟練度' }, { t: '特技一覧' },
      { t: '上級職' }, { t: 'おすすめ職業' }
    ]
  },
  {
    title: '呪文・スキル',
    items: [
      { t: '攻撃呪文' }, { t: '回復呪文' }, { t: '補助呪文' },
      { t: '移動呪文' }, { t: '消費MP一覧' }, { t: '習得条件' }
    ]
  },
  {
    title: '武器・防具',
    items: [
      { t: '武器一覧' }, { t: '防具一覧' }, { t: '盾・兜' },
      { t: 'アクセサリ' }, { t: '最強装備' }, { t: 'エンチャント' }
    ]
  },
  {
    title: 'アイテム・素材',
    items: [
      { t: '道具一覧' }, { t: '素材一覧' }, { t: 'ちいさなメダル' },
      { t: '種・木の実' }, { t: 'たね泥棒対策' }, { t: '入手場所逆引き' }
    ]
  },
  {
    title: '錬金・クラフト',
    items: [
      { t: '錬金レシピ' }, { t: 'クラフト台' }, { t: '装備の強化' },
      { t: '素材の集め方' }, { t: '錬金効率' }
    ]
  },
  {
    title: 'ダンジョン・施設',
    items: [
      { t: 'ダンジョン一覧' }, { t: '祠・遺跡' }, { t: '村・町' },
      { t: '宝箱の中身' }, { t: '出現条件' }
    ]
  },
  {
    title: 'バイオーム・マップ',
    items: [
      { t: 'バイオーム一覧' }, { t: '湧き対応表' }, { t: 'ネザー' },
      { t: '果ての世界' }, { t: '座標メモ' }
    ]
  },
  {
    title: 'マルチプレイ', acc: true,
    items: [
      { t: 'サーバー構築' }, { t: 'コンフィグ設定' }, { t: '湧き上限の共有' },
      { t: 'おすすめ設定' }, { t: '同期の不具合' }
    ]
  },
  {
    title: 'MOD情報・不具合', acc: true,
    items: [
      { t: '導入方法', link: '/guide/install' }, { t: 'よくある質問', link: '/guide/faq' },
      { t: '前提MOD' }, { t: '競合MOD' }, { t: '不具合報告' }, { t: 'MOD更新履歴' }
    ]
  }
]

const log = [
  { d: '08-29', t: 'モンスター図鑑 579体を追加', link: '/monsters/', who: 'Claude' },
  { d: '08-29', t: '魔王・ボス 17体を追加', link: '/bosses/', who: 'Claude' },
  { d: '08-26', t: '職業一覧', link: '/jobs/', who: 'Claude' },
  { d: '08-26', t: '編集のしかた', link: '/guide/edit', who: 'Claude' },
  { d: '08-26', t: '導入方法', link: '/guide/install', who: 'Claude' }
]

const wanted = ['各モンスターの攻略メモ・出現場所', '序盤の進め方', '武器一覧・防具一覧', '錬金レシピ']
</script>

<template>
  <div v-if="frontmatter.top" class="wiki-top">
    <div class="top-head">
      <h1>{{ frontmatter.title }}</h1>
      <p class="sub">{{ frontmatter.tagline }}</p>
    </div>

    <div class="top-meta">
      <span v-for="m in meta" :key="m.label"><b>{{ m.label }}</b>{{ m.value }}</span>
    </div>

    <div class="startbar">
      <a v-for="s in start" :key="s.t" :href="withBase(s.link)">
        <span class="n">{{ s.n }}</span>
        <span class="t">{{ s.t }}</span>
        <span class="d">{{ s.d }}</span>
      </a>
    </div>

    <h2 class="sec-h">大題目<span class="note">灰色の項目はまだ作られていないページです</span></h2>

    <div class="cat-wall">
      <div v-for="c in cats" :key="c.title" class="cat" :class="{ acc: c.acc }">
        <h3>{{ c.title }}</h3>
        <ul>
          <li v-for="i in c.items" :key="i.t" :class="{ wide: i.wide }">
            <a v-if="i.link" :href="withBase(i.link)">{{ i.t }}</a>
            <span v-else class="todo">{{ i.t }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="two-col">
      <div>
        <h2 class="sec-h">更新履歴</h2>
        <div class="log">
          <ul>
            <li v-for="l in log" :key="l.t">
              <time>{{ l.d }}</time>
              <a :href="withBase(l.link)">{{ l.t }}</a>
              <span class="who">{{ l.who }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div>
        <h2 class="sec-h">編集募集中</h2>
        <div class="wanted">
          <ul>
            <li v-for="w in wanted" :key="w">{{ w }}</li>
          </ul>
          <p>
            手が足りていない項目です。断片的な情報でも構いません。書き方は
            <a :href="withBase('/guide/edit')">編集のしかた</a>を見てください。
          </p>
        </div>
      </div>
    </div>

    <div class="about">
      <b>このwikiについて</b>　有志による非公式wikiです。掲載内容の正確性は保証されません。数値は検証環境によって異なる場合があります。誤りを見つけたら、そのページの「このページをブラウザで編集する」から直してください。編集履歴はすべて残るので、失敗しても元に戻せます。
    </div>
  </div>
</template>
