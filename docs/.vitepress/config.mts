import { defineConfig } from 'vitepress'
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 対応バージョン。MODから取り出したデータに、元にしたjarの名前が入っている。
 * そこから読むので、新しいjarで作り直せば表示も自動でついてくる。
 */
function modVersion(): string {
  for (const f of ['scripts/data/monster-extras.json', 'scripts/data/equipment.json']) {
    if (!existsSync(f)) continue
    const jar = String(JSON.parse(readFileSync(f, 'utf8')).jar ?? '')
    const hit = jar.match(/(\d+\.\d+\.\d+)/)
    if (hit) return `DQMVI ${hit[1]}`
  }
  return 'DQMVI'
}

/**
 * 図鑑の「画像」列に出す画像を探す。
 * 生成側（scripts/gen-monster-pages.mjs）は行に ![名前](/img/monsters/<ID>.png) と書くだけで、
 * 実際にどのファイルを出すかはビルドのたびにここで決める:
 *   docs/public/img/monsters/<ID>.png か <名前>.png（png / jpg / jpeg / gif / webp / avif）があればそれ、
 *   無ければ透明の /img/blank.png（枠だけ。theme/custom.css が正方形にする）。
 * → 画像を置いて push するだけで次の公開に載る。表の再生成は要らない（2026-09-03 よっしー
 *   「配置してみましたが表示されません」→ 再生成しないと差し替わらない作りだったのを直した）。
 * ★拡張子は小文字だけ拾う。.PNG は Vite が画像と見なさず、参照するとビルドが落ちるため。
 * ★存在しないファイルを src に残すと「Rollup failed to resolve import」でビルドが落ちるので、
 *   必ず blank.png に落とす。
 */
const MONSTER_IMG_DIR = 'docs/public/img/monsters'
const MONSTER_IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']
const warnedImages = new Set<string>()
function findMonsterImage(id: string, name: string): string | undefined {
  if (!existsSync(MONSTER_IMG_DIR)) return undefined
  const files = new Map<string, string>()
  for (const f of readdirSync(MONSTER_IMG_DIR)) {
    const ext = f.slice(f.lastIndexOf('.') + 1)
    if (MONSTER_IMG_EXTS.includes(ext)) files.set(f.toLowerCase(), f)
    else if (MONSTER_IMG_EXTS.includes(ext.toLowerCase()) && !warnedImages.has(f)) {
      warnedImages.add(f)
      console.warn(`注意: ${MONSTER_IMG_DIR}/${f} は拡張子を小文字（.${ext.toLowerCase()}）にしないと載りません`)
    }
  }
  for (const stem of [id, name]) {
    if (!stem) continue
    for (const ext of MONSTER_IMG_EXTS) {
      const f = files.get(`${stem}.${ext}`.toLowerCase())
      if (f) return f
    }
  }
  return undefined
}

/**
 * トップページに出す「ページ数」と「最終更新」を、ビルドのたびに数え直す。
 * 手で書いていると必ず実態とずれるため。
 */
function countPages(dir: string): number {
  let n = 0
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) n += countPages(p)
    else if (name.endsWith('.md')) n++
  }
  return n
}

/**
 * 図鑑の絞り込みボタン（転生・ボス・コインボス）に使う、モンスターの種類の一覧。
 * scripts/data/monster-kinds.json を手で書く（書き方はその中の「_説明」）。載っていないものは「雑魚」。
 * 壊れたJSONでもビルドは止めず、警告を出して空にする（ボタンは出るが転生などが空になる）。
 */
function monsterKinds(): Record<string, string[]> {
  try {
    const raw = JSON.parse(readFileSync('scripts/data/monster-kinds.json', 'utf8')) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_') || !Array.isArray(v)) continue
      out[k] = v.map((x) => String(x).trim()).filter(Boolean)
    }
    return out
  } catch (e) {
    console.warn(`注意: scripts/data/monster-kinds.json が読めません（${(e as Error).message}）。図鑑の種類の絞り込みが空になります`)
    return {}
  }
}

/**
 * トップページの帯に出す値。ページ数と最終更新はビルドのたびに数える。
 * ★件数（586体・210種…）はナビ・サイドバー・トップの大ボタンのどこにも出さない
 *   （2026-09-03 よっしー「(586体)とか(210種)とかの表記もいらない」「それもいらないです」）。
 */
const SITE_STATS = {
  pages: countPages('docs'),
  updated: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
  modVersion: modVersion()
}

// ─────────────────────────────────────────────────────────────
//  ★ここだけ自分の値に書き換えてください
// ─────────────────────────────────────────────────────────────
const GITHUB_USER = 'Dhou1magus'
const REPO_NAME   = 'dqmvi-wiki'
const SITE_URL    = `https://${GITHUB_USER}.github.io/${REPO_NAME}/`
// ─────────────────────────────────────────────────────────────

/**
 * トップページの検索に使う「名前の索引」。
 *
 * 全ページの title と種別だけを集めた軽い表。モンスター名やアイテム名を
 * 打った瞬間に候補を出すためのもの。本文の全文検索はVitePress標準のほうが
 * 担当する（トップの検索欄からも開ける）。
 *
 * ビルドのたびに docs/ を歩いて作るので、家族がGitHubでページを足しても
 * 次のデプロイで自動的に索引に入る。手で更新する必要はない。
 *
 * 仮想モジュールにしてあるのは、この表を全ページのバンドルに載せないため。
 * トップページが検索を使うときだけ動的importで読み込まれる。
 */
const VIRTUAL_INDEX = 'virtual:wiki-index'

/** URLの先頭ディレクトリ → 画面に出す種別 */
const KIND_BY_DIR: Record<string, string> = {
  monsters: 'モンスター', drops: 'ドロップ品', species: '系統',
  biomes: '出現場所', items: '装備・道具', jobs: '職業', spells: '呪文',
  skills: '特技', play: '遊び方', guide: '案内'
}

function buildWikiIndex(dir: string, base = '', out: string[][] = []): string[][] {
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      buildWikiIndex(full, `${base}${name}/`, out)
      continue
    }
    if (!name.endsWith('.md')) continue
    const text = readFileSync(full, 'utf8')
    // frontmatter の title、無ければ本文の見出し
    const title = text.match(/^title:\s*(.+)$/m)?.[1].trim()
      ?? text.match(/^#\s+(.+)$/m)?.[1].trim()
    if (!title) continue
    // 中身が空のページ（名前だけ用意してあるアイテムの個別ページ）は候補に出さない。
    // 名前で引いたときは、空のページより一覧の行（name-index.json 側）へ飛ばすほうが早い。
    // 何か書かれた時点でこちらが勝つ。
    if (!text.replace(/^---[\s\S]*?\n---/, '').replace(/^#\s.*$/m, '').trim()) continue
    const url = `/${base}${name === 'index.md' ? '' : name.replace(/\.md$/, '')}`
    if (url === '/') continue // トップページ自身は候補に出さない
    out.push([title, url, KIND_BY_DIR[base.split('/')[0]] ?? ''])
  }
  return out
}

function wikiIndexPlugin() {
  return {
    name: 'wiki-name-index',
    resolveId: (id: string) => (id === VIRTUAL_INDEX ? `\0${VIRTUAL_INDEX}` : null),
    load(id: string) {
      if (id !== `\0${VIRTUAL_INDEX}`) return null
      // [名前, URL, 種別] の並び。JSONで埋め込む（式は入らない）
      const pages = buildWikiIndex('docs')
      // 自分のページを持たないもの（呪文・特技・多くの装備）を足す。
      // scripts/gen-*.mjs が scripts/data/name-index.json に書いている。
      // 同じ名前のページがあれば、ページのほうを残す。
      const taken = new Set(pages.map(([title]) => title))
      let extra: string[][] = []
      try {
        const groups = JSON.parse(readFileSync('scripts/data/name-index.json', 'utf8'))
        extra = (Object.values(groups) as string[][][]).flat()
          .filter(([title, url]) => title && url && url.startsWith('/') && !taken.has(title))
      } catch {
        extra = []
      }
      return `export const pages = ${JSON.stringify([...pages, ...extra])}\n`
    }
  }
}

export default defineConfig({
  lang: 'ja-JP',
  title: 'DQMVI 攻略wiki',
  description: 'Minecraft ドラクエMOD「DQMVI」の攻略情報・モンスター図鑑・アイテムデータまとめ',

  // GitHub Pages のサブパス配信用。独自ドメインを使う場合は '/' に変更
  base: `/${REPO_NAME}/`,

  cleanUrls: true,
  lastUpdated: true,
  metaChunk: true,

  // 初回は端末の設定（OS/ブラウザのダークモード）に自動で合わせる。
  // 表示中の切り替えはナビバーの3択スイッチ（theme/ThemeSwitch.vue）が担当する
  appearance: true,

  // 検索エンジンに拾わせるための設定
  sitemap: { hostname: SITE_URL },

  vite: { plugins: [wikiIndexPlugin()] },

  // ───────────────────────────────────────────────────────────
  //  セキュリティ: frontmatter の head を無効化する
  //
  //  VitePress は各ページのfrontmatterに head: を書くと、そのページの
  //  <head> に任意のタグを差し込める。これは markdown.html: false を
  //  すり抜けて <script> を注入できる経路になるため、ビルド時に捨てる。
  //  ★この関数を消さないこと。
  // ───────────────────────────────────────────────────────────
  transformPageData(pageData) {
    if (pageData.frontmatter && 'head' in pageData.frontmatter) {
      console.warn(
        `[security] ${pageData.relativePath} の frontmatter に head があったため無視しました`
      )
      delete pageData.frontmatter.head
    }
  },

  // ───────────────────────────────────────────────────────────
  //  セキュリティ: 本文の生HTMLを一切通さない
  //
  //  html:false にすると、記事に <script> や onclick= を書き込まれても
  //  ただの文字として表示されるだけで実行されない。
  //  攻略wikiに必要な表現（表・注記枠・ステータス枠）は下の記法で
  //  代替してあるので、編集者が生HTMLを書く必要はない。
  //  ★ここを true に戻すと、編集権限を持つ全員がサイト訪問者のブラウザで
  //    任意のスクリプトを実行できるようになる。戻さないこと。
  // ───────────────────────────────────────────────────────────
  markdown: {
    html: false,
    linkify: false,
    // 本文の画像は見えるところまで来てから読む（図鑑の586行ぶんの画像を一度に取りにいかない）
    image: { lazyLoading: true },
    config(md) {
      // ```stats ブロックをステータス枠に変換する
      //   HP | 6
      //   しゅび | 255 !     ← 末尾の ! で強調表示
      // ★波かっこも必ずエスケープすること。
      //   ここを外すと ```stats の中に {{ 式 }} を書かれてビルド時に評価される。
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')

      // ── 本文中の {{ }} を無害化する ──
      // VitePressは本文をVueテンプレートとして扱うため、markdown.html:false でも
      // {{ 式 }} はそのまま評価される。文字として表示させるため実体参照に置換する。
      // ★この置換を消さないこと。
      const textRule = md.renderer.rules.text
      md.renderer.rules.text = (tokens, idx, options, env, self) => {
        const out = textRule
          ? textRule(tokens, idx, options, env, self)
          : md.utils.escapeHtml(tokens[idx].content)
        return out.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      }

      // インラインコード（`...`）も同じく無害化する。
      // text ルールだけを差し替えても code_inline は素通りしてしまう。
      const codeRule = md.renderer.rules.code_inline
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        const out = codeRule
          ? codeRule(tokens, idx, options, env, self)
          : `<code>${md.utils.escapeHtml(tokens[idx].content)}</code>`
        return out.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      }

      // ── 図鑑の「画像」列: /img/monsters/<ID>.png を、置いてある画像に差し替える ──
      // 上の findMonsterImage を参照。VitePress 側の画像ルール（遅延読み込みの付与）の手前で src を決める。
      const imageRule = md.renderer.rules.image!
      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const hit = (token.attrGet('src') ?? '').match(/^\/img\/monsters\/([^/]+)\.[A-Za-z0-9]+$/)
        if (hit) {
          const found = findMonsterImage(decodeURIComponent(hit[1]), token.content.trim())
          if (found) {
            token.attrSet('src', `/img/monsters/${encodeURIComponent(found)}`)
          } else {
            token.attrSet('src', '/img/blank.png')
            token.children = [] // alt を空にする（枠だけなので読み上げも不要）
          }
        }
        return imageRule(tokens, idx, options, env, self)
      }

      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (token.info.trim() !== 'stats') return fence(tokens, idx, options, env, self)

        const cells = token.content
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, ...rest] = line.split('|')
            let value = rest.join('|').trim()
            const hi = value.endsWith('!')
            if (hi) value = value.slice(0, -1).trim()
            return `<div><b>${esc((label || '').trim())}</b><span${
              hi ? ' class="hi"' : ''
            }>${esc(value)}</span></div>`
          })
          .join('')

        return `<div class="dq-stats">${cells}</div>`
      }
    }
  },

  head: [
    ['meta', { name: 'theme-color', content: '#0F7A4A' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'DQMVI 攻略wiki' }],
    ['meta', { property: 'og:locale', content: 'ja_JP' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      // 使うのは M PLUS Rounded 1c 800（見出し）と Zen Maru Gothic 500（本文）の2つだけ
      href: 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&family=Zen+Maru+Gothic:wght@500&display=swap'
    }]
  ],

  themeConfig: {
    // トップページの見出し脇に出す数字（ビルド時に自動で数える）
    siteStats: SITE_STATS,
    // 図鑑の絞り込みボタン用（theme/dex-filter.ts が読む）
    monsterKinds: monsterKinds(),

    // ── 上部ナビ ──
    //  項目を横一列に並べると、幅768〜960pxの画面（タブレット横向きなど）で
    //  検索欄やテーマ切替と一緒に並びきらず、右にはみ出して横スクロールが出る。
    //  VitePressがハンバーガーに切り替えるのは768px未満だけなので、
    //  データ系はまとめてドロップダウンにして項目数を減らしてある。
    nav: [
      { text: 'はじめに', link: '/guide/what-is-dqmvi' },
      { text: '遊び方', link: '/play/' },
      {
        text: 'データ',
        items: [
          { text: 'モンスター図鑑', link: '/monsters/' },
          { text: '出現場所から探す', link: '/biomes/' },
          { text: 'ドロップ品から探す', link: '/drops/' },
          { text: '系統から探す', link: '/species/' },
          { text: '職業一覧', link: '/jobs/' },
          { text: '呪文一覧', link: '/spells/' },
          { text: '特技一覧', link: '/skills/' },
          { text: 'アイテム一覧', link: '/items/' }
        ]
      },
      {
        text: 'wikiについて',
        items: [
          { text: 'MOD更新履歴', link: '/guide/updates' },
          { text: '編集のしかた', link: '/guide/edit' },
          { text: 'ご意見箱', link: '/guide/feedback' }
        ]
      }
    ],

    // ── サイドバー ──
    sidebar: [
      {
        text: 'はじめに',
        collapsed: false,
        items: [
          { text: 'DQMVIとは', link: '/guide/what-is-dqmvi' },
          { text: '導入方法', link: '/guide/install' },
          { text: 'よくある質問', link: '/guide/faq' }
        ]
      },
      {
        text: '遊び方ガイド',
        collapsed: false,
        items: [
          { text: '目次', link: '/play/' },
          { text: 'はじめに', link: '/play/start' },
          { text: '冒険のきほん', link: '/play/basics' },
          { text: 'ペットと配合', link: '/play/pets' },
          { text: 'ガンビット', link: '/play/gambit' },
          { text: '転職とサブ職業', link: '/play/jobs' },
          { text: 'アイテム', link: '/play/items' },
          { text: '鍛冶', link: '/play/smithing' },
          { text: '農業', link: '/play/farming' },
          { text: '釣り', link: '/play/fishing' },
          { text: '施設と暮らし', link: '/play/facilities' },
          { text: 'クエスト', link: '/play/quests' }
        ]
      },
      {
        text: 'データ',
        collapsed: false,
        items: [
          { text: 'モンスター図鑑', link: '/monsters/' },
          { text: '出現場所から探す', link: '/biomes/' },
          { text: 'ドロップ品から探す', link: '/drops/' },
          { text: '系統から探す', link: '/species/' },
          { text: '職業一覧', link: '/jobs/' },
          { text: '呪文一覧', link: '/spells/' },
          { text: '特技一覧', link: '/skills/' },
          { text: 'アイテム一覧', link: '/items/' },
          { text: '　武器', link: '/items/weapons' },
          { text: '　防具', link: '/items/armor' },
          { text: '　盾', link: '/items/shields' },
          { text: '　アクセサリー', link: '/items/accessories' },
          { text: '　転生装備', link: '/items/tensei' },
          { text: '　素材', link: '/items/materials' },
          { text: '　種', link: '/items/seeds' },
          { text: '　釣り', link: '/items/fishing' },
          { text: '　特殊', link: '/items/special' },
          { text: '　建物', link: '/items/buildings' },
          { text: '　呪文', link: '/items/magic' },
          { text: '　装飾', link: '/items/decoration' }
        ]
      },
      {
        text: 'wikiの運営',
        collapsed: false,
        items: [
          { text: 'MOD更新履歴', link: '/guide/updates' },
          { text: '編集のしかた', link: '/guide/edit' },
          { text: 'ご意見箱', link: '/guide/feedback' }
        ]
      }
    ],

    // ── 全文検索（日本語対応・外部サービス不要） ──
    search: {
      provider: 'local',
      options: {
        // 日本語は空白で区切られないため、2文字ずつ(bigram)に刻んで索引を作る
        miniSearch: {
          options: {
            tokenize: (text: string) =>
              text
                .split(/[\s\-_/、。，．,.()（）「」『』【】]+/u)
                .flatMap((w) => {
                  if (!w) return []
                  // 日本語を含む語は、語そのもの＋2文字ずつの断片で登録する
                  if (/[ぁ-ヿ一-鿿]/u.test(w)) {
                    const grams: string[] = []
                    for (let i = 0; i < w.length; i++) {
                      grams.push(w[i])
                      if (i + 2 <= w.length) grams.push(w.slice(i, i + 2))
                    }
                    return grams
                  }
                  return [w.toLowerCase()]
                })
          },
          // 断片すべてを含むページだけを出す（AND検索）＝ノイズを抑える
          searchOptions: {
            combineWith: 'AND',
            fuzzy: false,
            prefix: false,
            boost: { title: 5, titles: 2, text: 1 }
          }
        },
        translations: {
          button: { buttonText: '検索', buttonAriaLabel: 'サイト内検索' },
          modal: {
            displayDetails: '詳細を表示',
            resetButtonTitle: '検索をリセット',
            backButtonTitle: '閉じる',
            noResultsText: '見つかりませんでした:',
            footer: {
              selectText: '選択',
              selectKeyAriaLabel: 'Enter',
              navigateText: '移動',
              navigateUpKeyAriaLabel: '↑',
              navigateDownKeyAriaLabel: '↓',
              closeText: '閉じる',
              closeKeyAriaLabel: 'Esc'
            }
          }
        }
      }
    },

    // ── 身内がブラウザから編集するための導線 ──
    // 実際の表示は theme/PageActions.vue が行う（標準のリンクはCSSで隠している）
    editLink: {
      pattern: `https://github.com/${GITHUB_USER}/${REPO_NAME}/edit/main/docs/:path`,
      text: 'このページをブラウザで編集する'
    },

    // ── ページ単位の変更履歴（＝バックアップと復元） ──
    // GitHubが各ファイルの全世代を保持しているので、ここへ飛べば
    // 過去の版の閲覧・差分確認・復元がその場でできる
    historyLink: {
      pattern: `https://github.com/${GITHUB_USER}/${REPO_NAME}/commits/main/docs/:path`,
      text: 'このページの変更履歴・復元'
    },

    lastUpdated: {
      text: '最終更新',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short', forceLocale: true }
    },

    outline: { level: [2, 3], label: 'このページの目次' },
    docFooter: { prev: '前のページ', next: '次のページ' },
    darkModeSwitchLabel: 'テーマ',
    lightModeSwitchTitle: 'ライトモードに切り替え',
    darkModeSwitchTitle: 'ダークモードに切り替え',
    sidebarMenuLabel: 'メニュー',
    returnToTopLabel: 'トップへ戻る',
    externalLinkIcon: true,

    socialLinks: [
      { icon: 'github', link: `https://github.com/${GITHUB_USER}/${REPO_NAME}` }
    ],

    footer: {
      // このwikiへの意見を受け取る窓口。全ページの下から行けるようにしておく
      message:
        '有志による作者公認wikiです。記載内容の正確性は保証されません。'
        + ` <a href="/${REPO_NAME}/guide/feedback">ご意見箱</a>`,
      copyright: 'DQMVI 攻略wiki'
    }
  }
})
