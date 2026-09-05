<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'

const { frontmatter, theme } = useData()

// ───────────────────────────────────────────────────────────
//  トップページ
// ───────────────────────────────────────────────────────────
const stats = computed(() => theme.value.siteStats ?? {})

const meta = computed(() => [
  { label: '対応バージョン', value: stats.value.modVersion ?? 'DQMVI' },
  { label: '最終更新', value: stats.value.updated ?? '—' },
  { label: 'ページ数', value: String(stats.value.pages ?? '—') },
  { label: '編集者', value: '募集中' }
])

// ── よく使うページ。ここが一番大きく、一番上に出る。
// アイコンの線画。d属性に入れるだけなので、文字列がそのまま描画されることはない。
const ICONS = {
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2 2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 20 5.5v11a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5zM12 6v13',
  crown: 'M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13zM6 20h12',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 4.5v3M17.5 6h3',
  sword: 'M14.5 3H21v6.5L11 19.5l-1.5-1.5M14.5 3L5 12.5 6.5 14M6.5 14L4 16.5 7.5 20l2.5-2.5M6.5 14l3.5 3.5',
  flag: 'M6 21V4M6 5h11l-2 3.5L17 12H6'
}

/** よく使う8つ。押しやすい大きさで一番上に置く。件数は出さない（2026-09-03 よっしー指示） */
const primary = [
  { icon: 'book', t: 'モンスター図鑑', d: 'HP・弱点・ドロップ・出現場所', link: '/monsters/' },
  { icon: 'box', t: 'ドロップ品から探す', d: 'あの素材を落とすのは誰か', link: '/drops/' },
  { icon: 'sword', t: '武器・防具', d: '攻撃力・倍率・特殊効果', link: '/items/' },
  { icon: 'person', t: '職業', d: '伸びる能力・覚える技・必殺技', link: '/jobs/' },
  { icon: 'spark', t: '呪文・特技', d: '消費MP・威力・範囲', link: '/spells/' },
  { icon: 'crown', t: '系統から探す', d: 'ドラゴン系・メタル系の顔ぶれ', link: '/species/' },
  { icon: 'pin', t: '出現場所から探す', d: 'そのバイオームに湧く顔ぶれ', link: '/biomes/' },
  { icon: 'flag', t: '遊び方ガイド', d: '始め方・配合・鍛冶・農業・釣り', link: '/play/' }
]

/** 「〜を知りたい」から引く導線。データの分類ではなく、その場の疑問で並べる */
const questions = [
  { q: 'そもそも何から始める？', a: 'はじめに', link: '/play/start' },
  { q: '仲間はどう育てる？', a: 'ペットと配合', link: '/play/pets' },
  { q: 'この素材、どこで手に入る？', a: 'ドロップ品から探す', link: '/drops/' },
  { q: '次はどの職業にする？', a: '職業一覧', link: '/jobs/' },
  { q: 'ドラゴン系って何が居る？', a: '系統から探す', link: '/species/' },
  { q: 'このへんに何が湧く？', a: '出現場所から探す', link: '/biomes/' }
]

const start = [
  { n: 'FIRST', t: 'DQMVIとは', d: 'どんなMODなのか、何が追加されるのか', link: '/guide/what-is-dqmvi' },
  { n: 'SETUP', t: '導入方法', d: '前提MOD・推奨環境・つまずきポイント', link: '/guide/install' },
  { n: 'PLAY', t: '遊び方ガイド', d: '始め方から釣り・農業・鍛冶まで', link: '/play/' },
  { n: 'JOIN', t: '編集のしかた', d: 'ブラウザだけで参加できます', link: '/guide/edit' }
]

// ── すべてのページ ────────────────────────────────────────
// link を書かない項目は「まだ無いページ」。読者向けの一覧からは自動で外れ、
// 下の「編集募集中」にまとまって出る。
const cats = computed(() => [
  {
    title: 'モンスター',
    items: [
      { t: 'モンスター図鑑', link: '/monsters/' },
      { t: '出現場所から探す', link: '/biomes/' },
      { t: 'ドロップ品から探す', link: '/drops/' },
      { t: '系統から探す', link: '/species/' }
    ]
  },
  {
    title: 'なかまモンスター',
    items: [
      { t: '仲間にする・育てる', link: '/play/pets' },
      { t: '作戦（ガンビット）', link: '/play/gambit' },
      { t: '配合', link: '/play/pets' },
      { t: '種族シナジー', link: '/play/pets' },
      { t: 'おすすめ編成' }
    ]
  },
  {
    title: '職業',
    items: [
      { t: '職業一覧', link: '/jobs/' },
      { t: '転職とサブ職業', link: '/play/jobs' },
      { t: '必殺技', link: '/jobs/' }, { t: '武器の適性', link: '/jobs/' },
      { t: 'おすすめ職業' }
    ]
  },
  {
    title: '呪文・特技',
    items: [
      { t: '呪文一覧', link: '/spells/' },
      { t: '特技一覧', link: '/skills/' },
      { t: '消費MPで探す', link: '/spells/' },
      { t: '武器別の特技', link: '/skills/' },
      { t: '移動呪文' }
    ]
  },
  {
    title: '武器・防具',
    items: [
      { t: '武器', link: '/items/weapons' },
      { t: '防具', link: '/items/armor' },
      { t: '盾', link: '/items/shields' },
      { t: 'アクセサリー', link: '/items/accessories' },
      { t: '転生装備', link: '/items/tensei' },
      { t: '特殊効果つきの装備', link: '/items/weapons' }
    ]
  },
  {
    title: 'アイテム・素材',
    items: [
      { t: 'アイテム一覧', link: '/items/' },
      { t: '素材', link: '/items/materials' }, { t: '種', link: '/items/seeds' },
      { t: '釣り', link: '/items/fishing' }, { t: '特殊', link: '/items/special' },
      { t: '建物', link: '/items/buildings' }, { t: '装飾', link: '/items/decoration' },
      { t: 'アイテムの使い方', link: '/play/items' },
      { t: '入手場所から逆引き', link: '/drops/' },
      { t: '種・作物の育て方', link: '/play/farming' }, { t: 'ちいさなメダル' }
    ]
  },
  {
    title: '鍛冶・クラフト',
    items: [
      { t: '装備を作る（目押し）', link: '/play/smithing' },
      { t: '品質と強化・分解', link: '/play/smithing' },
      { t: '素材の集め方', link: '/drops/' },
      { t: 'レシピ一覧' }
    ]
  },
  {
    title: 'ダンジョン・施設',
    items: [
      { t: 'ダンジョン一覧' }, { t: '村・町一覧' },
      { t: '拠点づくりとお店', link: '/play/facilities' },
      { t: 'マジックツールダンジョン', link: '/play/facilities' }
    ]
  },
  {
    title: 'バイオーム・マップ',
    items: [
      { t: 'バイオーム別の出現モンスター', link: '/biomes/' },
      { t: 'ネザー', link: '/biomes/nether' }, { t: '果ての世界', link: '/biomes/end' },
      { t: '座標メモ' }
    ]
  },
  {
    title: 'マルチプレイ',
    items: [
      { t: 'サーバー構築' }, { t: 'コンフィグ設定' },
      { t: '湧き上限の共有' }, { t: 'おすすめ設定' }, { t: '同期の不具合' }
    ]
  },
  {
    title: 'MOD情報・不具合',
    acc: true,
    items: [
      { t: '導入方法', link: '/guide/install' },
      { t: 'よくある質問', link: '/guide/faq' },
      { t: 'ご意見箱', link: '/guide/feedback' },
      { t: 'MOD更新履歴', link: '/guide/updates' },
      { t: '前提MOD' }, { t: '競合MOD' }
    ]
  }
])

/** 読者に見せる一覧。まだ無いページは外す */
const catsReady = computed(() => cats.value
  .map((c) => ({ ...c, items: c.items.filter((i) => i.link) }))
  .filter((c) => c.items.length))

/** まだ無いページ。編集募集の一覧になる */
const wanted = computed(() => {
  const out = []
  for (const c of cats.value) {
    for (const i of c.items) if (!i.link) out.push({ cat: c.title, t: i.t })
  }
  return out
})

const log = [
  { d: '09-05', t: 'MOD 0.28.16 に対応（モンスター38体・職業8職・武器5種が増えた）', link: '/monsters/', who: 'Claude' },
  { d: '09-05', t: '職業ページに「職業の特徴」と転職条件を追加', link: '/jobs/', who: 'Claude' },
  { d: '09-05', t: '素材一覧に「ランク」と鉱石の深さを追加', link: '/items/materials', who: 'Claude' },
  { d: '09-05', t: '図鑑に絞り込みボタン（ランク・雑魚・転生）を追加', link: '/monsters/', who: 'Claude' },
  { d: '09-03', t: '図鑑に「画像」の列を用意（画像はこれから。載せ方は編集ガイド）', link: '/monsters/', who: 'Claude' },
  { d: '09-03', t: '素材・種・釣りなどの一覧に「入手方法」を追加', link: '/items/materials', who: 'Claude' },
  { d: '09-03', t: 'アイテムを分類ごとのページに分けた（素材・種・釣り・特殊・建物・呪文・装飾）', link: '/items/', who: 'Claude' },
  { d: '09-03', t: 'アイテム834種に個別ページを用意（中身はこれから）', link: '/items/', who: 'Claude' },
  { d: '09-02', t: '編集ガイドに「MODの更新で増えたものを足す」を追加', link: '/guide/edit', who: 'Claude' },
  { d: '09-02', t: '図鑑にランク（1〜7）を追加', link: '/monsters/', who: 'Claude' },
  { d: '09-02', t: 'ボスのページを削除（終盤のネタバレのため）', link: '/monsters/', who: 'Claude' },
  { d: '09-02', t: '公式のMOD更新履歴735項目を転記', link: '/guide/updates', who: 'Claude' },
  { d: '09-02', t: 'よくある質問を公式Discordから作成', link: '/guide/faq', who: 'Claude' },
  { d: '09-01', t: '終盤のネタバレになる記述を削除', link: '/play/quests', who: 'Claude' },
  { d: '08-31', t: '系統から探すページを追加', link: '/species/', who: 'Claude' },
  { d: '08-31', t: 'ドロップ品からの逆引きを追加', link: '/drops/', who: 'Claude' },
  { d: '08-31', t: 'MOD 0.25.84 に対応', link: '/monsters/', who: 'Claude' },
  { d: '08-31', t: '装備の攻撃力・倍率・特殊効果を追加', link: '/items/weapons', who: 'Claude' },
  { d: '08-30', t: '遊び方ガイド・呪文・特技・職業を追加', link: '/play/', who: 'Claude' },
  { d: '08-29', t: 'モンスター図鑑を公開', link: '/monsters/', who: 'Claude' }
]

// ── トップの検索 ──────────────────────────────────────────
// ここで直接打てて、そのまま候補が出る。別の窓は開かない。
// 索引は「ページの名前と種別」だけの軽い表（config.mts の virtual:wiki-index）。
// 本文の中身まで探したいときは、下に出る「本文も含めて探す」から標準の検索へ渡す。
const query = ref('')
const active = ref(0)
const index = ref(null)
const box = ref(null)

/**
 * 索引（88KB）は別ファイル。全ページのバンドルには載せず、ここでだけ読む。
 * ★読み込みは手が空いたときに先回りしてやる。押してから読み始めると、
 *   打つほうが速くて一瞬「見つかりません」と出てしまう（実際に出た）。
 */
async function loadIndex() {
  if (index.value) return
  index.value = (await import('virtual:wiki-index')).pages
}
onMounted(() => {
  const later = () => { loadIndex() }
  if ('requestIdleCallback' in window) requestIdleCallback(later, { timeout: 2500 })
  else setTimeout(later, 800)
})

/** ひらがな→カタカナ、大文字小文字、全角スペースの違いを無視して比べる */
function normalize(text) {
  return text
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s・()（）]/g, '')
    .toLowerCase()
}

const MAX_HITS = 10

const hits = computed(() => {
  const q = normalize(query.value)
  if (!q || !index.value) return []
  const found = []
  for (const [title, url, kind, keywords] of index.value) {
    // 名前で当たれば上、名前に無くてもタグ（keywords）で当たれば下のほうに出す
    const at = normalize(title).indexOf(q)
    let rank = at === 0 ? 0 : at > 0 ? 1 : -1
    if (rank < 0 && keywords && normalize(keywords).includes(q)) rank = 2
    if (rank < 0) continue
    found.push({ title, url, kind, rank, len: title.length })
    if (found.length > 400) break
  }
  found.sort((a, b) => a.rank - b.rank || a.len - b.len)
  return found.slice(0, MAX_HITS)
})

watch(query, () => { active.value = 0 })

/** 索引に無いページの本文まで探したいとき。標準の検索に打った言葉を渡す */
function fullTextSearch() {
  const text = query.value
  document.querySelector('.DocSearch-Button')?.click()
  setTimeout(() => {
    const input = document.querySelector('.VPLocalSearchBox input, .DocSearch-Input')
    if (!input) return
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
  }, 60)
}

function go(hit) {
  if (hit) window.location.href = withBase(hit.url)
}

function onKey(event) {
  if (event.key === 'Escape') {
    query.value = ''
    box.value?.blur()
    return
  }
  if (!hits.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % hits.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value - 1 + hits.value.length) % hits.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    go(hits.value[active.value])
  }
}
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

    <div class="topsearch" :class="{ open: hits.length }">
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          ref="box"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="モンスター名・アイテム名で検索"
          aria-label="ページの名前で検索"
          @focus="loadIndex"
          @keydown="onKey"
        >
        <button v-if="query" class="clear" type="button" aria-label="消す" @click="query = ''">✕</button>
      </div>

      <div v-if="query" class="results">
        <a
          v-for="(h, i) in hits"
          :key="h.url"
          :href="withBase(h.url)"
          :class="{ on: i === active }"
          @mouseenter="active = i"
        >
          <span class="nm">{{ h.title }}</span>
          <span v-if="h.kind" class="kd">{{ h.kind }}</span>
        </a>
        <p v-if="!index" class="none">読み込み中…</p>
        <p v-else-if="!hits.length" class="none">「{{ query }}」に合う名前は見つかりませんでした。</p>
        <button class="full" type="button" @click="fullTextSearch">
          本文も含めて探す<kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
      </div>
    </div>

    <div class="tiles">
      <a v-for="p in primary" :key="p.t" :href="withBase(p.link)" class="tile">
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[p.icon]" /></svg>
        <span class="t">{{ p.t }}<i v-if="p.spoiler" class="sp">ネタバレ</i></span>
        <span class="d">{{ p.d }}</span>
      </a>
    </div>

    <h2 class="sec-h">こんなときは</h2>
    <div class="qlist">
      <a v-for="q in questions" :key="q.q" :href="withBase(q.link)">
        <span class="q">{{ q.q }}</span>
        <span class="a">{{ q.a }}</span>
      </a>
    </div>

    <h2 class="sec-h">はじめての人へ</h2>
    <div class="startbar">
      <a v-for="s in start" :key="s.t" :href="withBase(s.link)">
        <span class="n">{{ s.n }}</span>
        <span class="t">{{ s.t }}</span>
        <span class="d">{{ s.d }}</span>
      </a>
    </div>

    <h2 class="sec-h">すべてのページ</h2>
    <div class="cat-wall">
      <div v-for="c in catsReady" :key="c.title" class="cat" :class="{ acc: c.acc }">
        <h3>{{ c.title }}</h3>
        <ul>
          <li v-for="i in c.items" :key="i.t">
            <a :href="withBase(i.link)">{{ i.t }}</a>
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
            <li v-for="w in wanted" :key="w.cat + w.t"><b>{{ w.cat }}</b>{{ w.t }}</li>
          </ul>
          <p>
            まだ無いページです。断片的な情報でも構いません。書き方は
            <a :href="withBase('/guide/edit')">編集のしかた</a>を見てください。
          </p>
        </div>
      </div>
    </div>

    <div class="about">
      <b>このwikiについて</b>　有志による作者公認wikiです。掲載内容の正確性は保証されません。数値は検証環境によって異なる場合があります。誤りを見つけたら、そのページの「このページをブラウザで編集する」から直してください。編集履歴はすべて残るので、失敗しても元に戻せます。
    </div>
  </div>
</template>
