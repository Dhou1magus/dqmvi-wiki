<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

// 各ページの下に「編集」と「変更履歴・復元」の導線を出す。
// 履歴はGitHubがページ単位で全世代を保持しているので、
// バックアップ用のファイルをこちらで持つ必要はない。
const { theme, page, frontmatter } = useData()

const show = computed(
  () => frontmatter.value.layout !== 'page' && frontmatter.value.layout !== 'home'
)

const editUrl = computed(() =>
  (theme.value.editLink?.pattern || '').replace(/:path/g, page.value.filePath)
)
const historyUrl = computed(() =>
  (theme.value.historyLink?.pattern || '').replace(/:path/g, page.value.filePath)
)
</script>

<template>
  <div v-if="show" class="page-actions">
    <a :href="editUrl" target="_blank" rel="noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
        <path d="M14.5 6.5l3 3" />
      </svg>
      このページをブラウザで編集する
    </a>
    <a :href="historyUrl" target="_blank" rel="noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
        <path d="M3.2 4.6v4.2h4.2" />
        <path d="M12 7.6V12l3 1.8" />
      </svg>
      このページの変更履歴・復元
    </a>
  </div>
</template>
