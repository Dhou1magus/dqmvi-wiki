import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ThemeSwitch from './ThemeSwitch.vue'
import PageActions from './PageActions.vue'
import TopPage from './TopPage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // PC: ナビバーの右端 / スマホ: ハンバーガーメニューの中
      'nav-bar-content-after': () => h(ThemeSwitch),
      'nav-screen-content-after': () => h(ThemeSwitch),
      // 記事の末尾に「編集」「変更履歴・復元」の導線
      'doc-footer-before': () => h(PageActions),
      // トップページ（frontmatter に top: true があるページ）の中身
      'page-top': () => h(TopPage)
    })
  }
} satisfies Theme
