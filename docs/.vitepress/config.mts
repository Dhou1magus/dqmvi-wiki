import { defineConfig } from 'vitepress'

// ─────────────────────────────────────────────────────────────
//  ★ここだけ自分の値に書き換えてください
// ─────────────────────────────────────────────────────────────
const GITHUB_USER = 'Dhou1magus'
const REPO_NAME   = 'dqmvi-wiki'
const SITE_URL    = `https://${GITHUB_USER}.github.io/${REPO_NAME}/`
// ─────────────────────────────────────────────────────────────

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
    // ── 上部ナビ ──
    nav: [
      { text: 'はじめに', link: '/guide/what-is-dqmvi' },
      { text: '遊び方', link: '/play/' },
      { text: 'モンスター', link: '/monsters/' },
      { text: '魔王・ボス', link: '/bosses/' },
      { text: '出現場所', link: '/biomes/' },
      { text: '職業', link: '/jobs/' },
      { text: '呪文・特技', link: '/spells/' },
      { text: '編集のしかた', link: '/guide/edit' }
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
          { text: 'モンスター図鑑（579体）', link: '/monsters/' },
          { text: '魔王・ボス一覧（17体）', link: '/bosses/' },
          { text: '出現場所から探す', link: '/biomes/' },
          { text: '職業一覧（18種）', link: '/jobs/' },
          { text: '呪文一覧（69種）', link: '/spells/' },
          { text: '特技一覧（102種）', link: '/skills/' }
        ]
      },
      {
        text: 'wikiの運営',
        collapsed: false,
        items: [
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
        '有志による非公式wikiです。記載内容の正確性は保証されません。'
        + ` <a href="/${REPO_NAME}/guide/feedback">ご意見箱</a>`,
      copyright: 'DQMVI 攻略wiki'
    }
  }
})
