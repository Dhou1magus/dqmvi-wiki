import { h, nextTick, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import type { Theme } from 'vitepress'
import { setupSortableTables } from './sortable-tables'
import { markFaqTags } from './faq-tags'
import ThemeSwitch from './ThemeSwitch.vue'
import PageActions from './PageActions.vue'
import FeedbackBox from './FeedbackBox.vue'
import TopPage from './TopPage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // PC: ナビバーの右端 / スマホ: ハンバーガーメニューの中
      'nav-bar-content-after': () => h(ThemeSwitch),
      'nav-screen-content-after': () => h(ThemeSwitch),
      // 本文のすぐ下に、ご意見箱 →「編集」「変更履歴・復元」の順で並べる。
      // doc-after は最終更新や前後ページよりさらに下になってしまうため使わない。
      // ご意見箱は frontmatter に feedback: true があるページだけ中身が出る
      'doc-footer-before': () => [h(FeedbackBox), h(PageActions)],
      // トップページ（frontmatter に top: true があるページ）の中身
      'page-top': () => h(TopPage)
    })
  },
  setup() {
    // 一覧の表の見出しを押して並べ替えられるようにする。
    // ページを切り替えても読み込み直さないので、遷移のたびに付け直す
    const route = useRoute()
    const decorate = () => { setupSortableTables(); markFaqTags() }
    onMounted(decorate)
    watch(() => route.path, () => nextTick(decorate))
  }
} satisfies Theme
