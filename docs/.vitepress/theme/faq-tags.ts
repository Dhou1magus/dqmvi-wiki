/**
 * よくある質問の「タグ: a・b・c」の行を、小さなチップの並びにする。
 *
 * 本文に生のHTMLは書けない（markdown.html: false）ので、
 * 「タグ:」で始まる段落を表示側で見つけて class を付ける。
 * 文字は変えない。全文検索が拾うのは元の文字のまま。
 *
 * VitePressはページを切り替えても再読み込みしないので、
 * theme/index.ts から遷移のたびに markFaqTags() を呼ぶ。
 */
export function markFaqTags(): void {
  for (const p of document.querySelectorAll<HTMLParagraphElement>('.vp-doc p')) {
    if (p.dataset.tags === 'ready') continue
    const text = p.textContent?.trim() ?? ''
    if (!/^タグ[:：]/.test(text)) continue
    p.dataset.tags = 'ready'
    p.classList.add('faq-tags')
    const words = text.replace(/^タグ[:：]\s*/, '').split(/[・、]/).map((w) => w.trim()).filter(Boolean)
    p.textContent = ''
    const label = document.createElement('span')
    label.className = 'lbl'
    label.textContent = 'タグ'
    p.appendChild(label)
    for (const w of words) {
      const chip = document.createElement('span')
      chip.className = 'chip'
      chip.textContent = w
      p.appendChild(chip)
    }
  }
}
