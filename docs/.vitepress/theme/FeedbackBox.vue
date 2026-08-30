<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { FEEDBACK_FORM_URL, FEEDBACK_COOLDOWN_MINUTES } from './feedback-config'

// frontmatter に feedback: true があるページにだけ出す
const { frontmatter } = useData()
const show = computed(() => frontmatter.value.feedback === true)

/**
 * 設定されたURLを検査する。
 * 書き間違いや悪意ある差し替えで、まったく別のサイトを
 * このwikiの中に埋め込んでしまわないようにする。
 */
const formUrl = computed(() => {
  const raw = (FEEDBACK_FORM_URL || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return ''
    if (url.hostname !== 'docs.google.com') return ''
    return url.href
  } catch {
    return ''
  }
})

const COOLDOWN_MS = Math.max(1, FEEDBACK_COOLDOWN_MINUTES) * 60 * 1000
const STORE_KEY = 'dqmvi-wiki:feedback-sent-at'

const mounted = ref(false)
const state = ref('form') // form | thanks | cooldown
const remain = ref(0)
let timer = 0
let framePrimed = false

/** 最後に送った時刻。読めない設定のブラウザでは0（＝制限なし）として扱う */
function lastSentAt() {
  try {
    return Number(localStorage.getItem(STORE_KEY)) || 0
  } catch {
    return 0
  }
}

function markSent() {
  try {
    localStorage.setItem(STORE_KEY, String(Date.now()))
  } catch {
    // 保存できない設定でも、投稿そのものは成立しているので何もしない
  }
}

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = 0
}

function tick() {
  const left = lastSentAt() + COOLDOWN_MS - Date.now()
  remain.value = Math.max(0, left)
  if (left > 0) return
  stopTimer()
  framePrimed = false
  state.value = 'form'
}

function startTimer() {
  stopTimer()
  tick()
  timer = window.setInterval(tick, 1000)
}

/**
 * Googleフォームは別サイトなので、中で送信されたことを直接は知れない。
 * ただし送信すると枠の中が完了画面に切り替わり、2回目の読み込みが起きる。
 * それを送信の合図として使う。
 */
function onFrameLoad() {
  if (!framePrimed) {
    framePrimed = true
    return
  }
  markSent()
  state.value = 'thanks'
  startTimer()
}

/** 残り時間を「あと9分30秒」の形にする */
const remainText = computed(() => {
  const sec = Math.ceil(remain.value / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `あと${m}分${String(s).padStart(2, '0')}秒` : `あと${s}秒`
})

onMounted(() => {
  mounted.value = true
  if (Date.now() - lastSentAt() < COOLDOWN_MS) {
    state.value = 'cooldown'
    startTimer()
  }
})

onUnmounted(stopTimer)
</script>

<template>
  <section v-if="show" class="feedback">
    <!-- URLがまだ設定されていない、または安全でないとき -->
    <div v-if="!formUrl" class="fb-panel">
      <p class="fb-title">ただいま準備中です</p>
      <p>投稿の受け付けをまもなく開始します。もう少しお待ちください。</p>
    </div>

    <!-- 送信直後 -->
    <div v-else-if="state === 'thanks'" class="fb-panel fb-thanks">
      <p class="fb-title">送信しました。ありがとうございます</p>
      <p>いただいた内容は運営者が確認します。返事はできませんが、すべて読みます。</p>
      <p class="fb-note">続けて送るのを防ぐため、次の投稿は {{ remainText }} からできます。</p>
    </div>

    <!-- 連投防止の待ち時間中 -->
    <div v-else-if="state === 'cooldown'" class="fb-panel">
      <p class="fb-title">少し時間をおいてください</p>
      <p>さきほど投稿を受け取りました。次の投稿は {{ remainText }} からできます。</p>
      <p class="fb-note">書き足したいことがあるときは、時間をおいてまとめて送ってください。</p>
    </div>

    <!-- 投稿フォーム -->
    <div v-else class="fb-frame">
      <iframe
        v-if="mounted"
        :src="formUrl"
        title="ご意見の投稿フォーム"
        loading="lazy"
        referrerpolicy="no-referrer"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        @load="onFrameLoad"
      />
      <div v-else class="fb-skeleton">フォームを読み込んでいます…</div>
    </div>

    <p v-if="formUrl" class="fb-foot">
      投稿はGoogleフォームで受け付けています。名前や連絡先を書かなければ、誰が送ったかは分かりません。
    </p>
  </section>
</template>

<style scoped>
.feedback {
  margin: 28px 0 8px;
}

.fb-frame {
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--r, 10px);
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}
.fb-frame iframe {
  display: block;
  width: 100%;
  height: 900px;
  border: 0;
}
.fb-skeleton {
  display: grid;
  place-items: center;
  height: 900px;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

.fb-panel {
  border: 1px solid var(--vp-c-divider);
  border-left: 5px solid var(--vp-c-brand-1);
  border-radius: var(--r, 10px);
  background: var(--vp-c-bg-alt);
  padding: 22px 24px;
}
.fb-panel p { margin: 0 0 8px; line-height: 1.75; }
.fb-panel p:last-child { margin-bottom: 0; }
.fb-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.fb-note {
  font-size: 13.5px;
  color: var(--vp-c-text-2);
}

.fb-foot {
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-3);
  line-height: 1.7;
}

@media (max-width: 640px) {
  .fb-frame iframe,
  .fb-skeleton { height: 1100px; }
}
</style>
