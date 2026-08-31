<script setup>
import { useData, withBase } from 'vitepress'

const { frontmatter, theme } = useData()

// ───────────────────────────────────────────────────────────
//  トップページの中身。ここを書き換えると表示が変わる。
//  link を書けばリンクに、書かなければ「未作成」の灰色表示になる。
// ───────────────────────────────────────────────────────────
// ここは全部 config.mts がビルドのたびに数えて渡してくる。
// 対応バージョンも、MODから取り出したデータのjar名から読むので手で直さなくてよい。
const meta = [
  { label: '対応バージョン', value: theme.value.siteStats?.modVersion ?? 'DQMVI' },
  { label: '最終更新', value: theme.value.siteStats?.updated ?? '—' },
  { label: 'ページ数', value: String(theme.value.siteStats?.pages ?? '—') },
  { label: '編集者', value: '募集中' }
]

const start = [
  { n: 'FIRST', t: 'DQMVIとは', d: 'どんなMODなのか、何が追加されるのか', link: '/guide/what-is-dqmvi' },
  { n: 'SETUP', t: '導入方法', d: '前提MOD・推奨環境・つまずきポイント', link: '/guide/install' },
  { n: 'PLAY', t: '遊び方ガイド', d: '始め方から釣り・農業・鍛冶まで', link: '/play/' },
  { n: 'JOIN', t: '編集のしかた', d: 'ブラウザだけで参加できます', link: '/guide/edit' }
]

const cats = [
  {
    title: '遊び方ガイド',
    items: [
      { t: 'はじめに（モンスターポート）', link: '/play/start', wide: true },
      { t: '冒険のきほん', link: '/play/basics', wide: true },
      { t: 'ペットと配合', link: '/play/pets' }, { t: 'ガンビット', link: '/play/gambit' },
      { t: '鍛冶', link: '/play/smithing' }, { t: '農業', link: '/play/farming' },
      { t: '釣り', link: '/play/fishing' }, { t: '施設と暮らし', link: '/play/facilities' },
      { t: 'クエスト', link: '/play/quests' }
    ]
  },
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
      { t: 'モンスター図鑑 586体', link: '/monsters/', wide: true },
      { t: '魔王・ボス 17体', link: '/bosses/', wide: true },
      { t: '出現場所から探す', link: '/biomes/', wide: true },
      { t: 'ドロップ品から探す 223種', link: '/drops/', wide: true },
      { t: '系統別' }
    ]
  },
  {
    title: 'なかまモンスター',
    items: [
      { t: '仲間にする・育てる', link: '/play/pets', wide: true },
      { t: '作戦（ガンビット）', link: '/play/gambit', wide: true },
      { t: '配合', link: '/play/pets' },
      { t: 'おすすめ編成' }, { t: '種族シナジー', link: '/play/pets' }
    ]
  },
  {
    title: '職業',
    items: [
      { t: '職業一覧 18種', link: '/jobs/', wide: true },
      { t: '転職とサブ職業', link: '/play/jobs', wide: true },
      { t: '必殺技', link: '/jobs/' }, { t: '武器の適性', link: '/jobs/' },
      { t: 'おすすめ職業' }
    ]
  },
  {
    title: '呪文・特技',
    items: [
      { t: '呪文一覧 69種', link: '/spells/', wide: true },
      { t: '特技一覧 102種', link: '/skills/', wide: true },
      { t: '消費MPで探す', link: '/spells/' }, { t: '武器別の特技', link: '/skills/' },
      { t: '移動呪文' }
    ]
  },
  {
    title: '武器・防具',
    items: [
      { t: '武器 221種', link: '/items/weapons', wide: true },
      { t: '防具 165種', link: '/items/armor', wide: true },
      { t: '盾 38種', link: '/items/shields' }, { t: 'アクセサリー 116種', link: '/items/accessories' },
      { t: '転生装備 56種', link: '/items/tensei', wide: true },
      { t: '特殊効果つきの装備', link: '/items/weapons' }
    ]
  },
  {
    title: 'アイテム・素材',
    items: [
      { t: 'アイテム一覧 1071種', link: '/items/', wide: true },
      { t: 'アイテムの使い方', link: '/play/items', wide: true },
      { t: '素材 132種', link: '/items/' }, { t: '種・作物', link: '/play/farming' },
      { t: '入手場所逆引き', link: '/drops/', wide: true }, { t: 'ちいさなメダル' }
    ]
  },
  {
    title: '鍛冶・クラフト',
    items: [
      { t: '装備を作る（目押し）', link: '/play/smithing', wide: true },
      { t: '品質と強化・分解', link: '/play/smithing', wide: true },
      { t: 'レシピ一覧' }, { t: '素材の集め方' }
    ]
  },
  {
    title: 'ダンジョン・施設',
    items: [
      { t: '拠点づくりとお店', link: '/play/facilities', wide: true },
      { t: 'マジックツールダンジョン', link: '/play/facilities', wide: true },
      { t: 'ダンジョン一覧' }, { t: '宝箱の中身' }, { t: '村・町' }
    ]
  },
  {
    title: 'バイオーム・マップ',
    items: [
      { t: 'バイオーム別の出現モンスター', link: '/biomes/', wide: true },
      { t: 'ネザー', link: '/biomes/nether' }, { t: '果ての世界', link: '/biomes/end' },
      { t: 'バイオーム一覧', link: '/biomes/' }, { t: '座標メモ' }
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
      { t: 'ご意見箱', link: '/guide/feedback' },
      { t: '前提MOD' }, { t: '競合MOD' }, { t: 'MOD更新履歴' }
    ]
  }
]

const log = [
  { d: '08-31', t: 'ドロップ品からの逆引き 223種を追加', link: '/drops/', who: 'Claude' },
  { d: '08-31', t: 'MOD 0.25.84 に対応（モンスター7体・呪文の威力を更新）', link: '/monsters/', who: 'Claude' },
  { d: '08-31', t: '装備の攻撃力・倍率・特殊効果を追加', link: '/items/weapons', who: 'Claude' },
  { d: '08-30', t: '装備を種類ごとの5ページに分割', link: '/items/', who: 'Claude' },
  { d: '08-30', t: '遊び方ガイド11ページを追加', link: '/play/', who: 'Claude' },
  { d: '08-30', t: '呪文69種・特技102種を追加', link: '/spells/', who: 'Claude' },
  { d: '08-30', t: '職業18種を実データに差し替え', link: '/jobs/', who: 'Claude' },
  { d: '08-30', t: 'ご意見箱を設置', link: '/guide/feedback', who: 'Claude' },
  { d: '08-29', t: 'モンスター図鑑 579体・魔王ボス17体', link: '/monsters/', who: 'Claude' }
]

const wanted = ['各モンスターの攻略メモ', '序盤の進め方', 'レベル上げ・金策', '系統別の一覧']
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
