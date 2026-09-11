import { h, nextTick, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute, useData } from 'vitepress'
import type { Theme } from 'vitepress'
import { setupSortableTables } from './sortable-tables'
import { markFaqTags } from './faq-tags'
import { setupDexFilter, type Kinds } from './dex-filter'
import { setupPetChecklist } from './pet-checklist'
import ThemeSwitch from './ThemeSwitch.vue'
import PageActions from './PageActions.vue'
import FeedbackBox from './FeedbackBox.vue'
import TopPage from './TopPage.vue'
import './custom.css'
import './button-feedback.css'
import './pet-checklist.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(ThemeSwitch),
      'nav-screen-content-after': () => h(ThemeSwitch),
      'doc-footer-before': () => [h(FeedbackBox), h(PageActions)],
      'page-top': () => h(TopPage)
    })
  },
  setup() {
    const route = useRoute()
    const { theme } = useData()
    const kinds = () => (theme.value as { monsterKinds?: Kinds }).monsterKinds
    const decorate = () => { setupPetChecklist(); setupSortableTables(); markFaqTags(); setupDexFilter(kinds()) }
    onMounted(decorate)
    watch(() => route.path, () => nextTick(decorate))
  }
} satisfies Theme
