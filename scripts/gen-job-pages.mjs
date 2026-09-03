#!/usr/bin/env node
/**
 * 職業のページを、MOD本体のデータから作り直す。
 *
 *   node scripts/gen-job-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * ★載せてよいのは「実際にゲームを遊んでいて分かること」だけ。
 *   武器適性や能力の伸びのランク、習得レベル、SP、効果の説明文は
 *   ゲーム内の職業画面に出るのでそのまま載せる。
 *
 * 読むファイル:
 *   scripts/data/equipment.json … 盾の適正職業（固定データ。scripts/data/README.md）
 *   job_tables.tsv … 表に出す並び順、武器14種の適性ランク、能力6項目の伸びランク
 *   job_skills.tsv … 職業ごとの習得スキル（13段階）。種類は3つ
 *                      stat     … 能力が上がる
 *                      unlock   … 他の職業でもその職の呪文・特技を使えるようになる
 *                      hissatsu … 必殺技
 *
 * 書き出すファイル:
 *   docs/jobs/index.md   職業一覧
 *   docs/jobs/<名前>.md  各職業
 *
 * 「## 攻略メモ」以降に手で書いた内容は、作り直しても消さずに残す。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { recordCounts } from './lib/counts.mjs'
import { extraRows, leftoverTables, finish, withExtraSections, mergeHandwrittenPages, plainName } from './lib/handwritten.mjs'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-job-pages.mjs <ext/assets/dqmvi のパス>')
  process.exit(1)
}

const DOCS = 'docs'
const JOB_DIR = join(DOCS, 'jobs')
const KEEP_HEADING = '## 攻略メモ'
const EMPTY_NOTE = '（未記入）'

/** 武器の並び。job_tables.tsv の weapon 行はこの順で14個ならぶ */
const WEAPONS = ['バニラ剣', '剣', '勇者の剣', '槍', '短剣', '杖', '棍', '爪',
                 '拳', 'ハンマー', '斧', 'ムチ', '弓', 'ブーメラン']
/** 能力の並び。stat 行はこの順で6個ならぶ */
const STATS = ['HP', 'MP', 'こうげき', 'しゅび', 'まりょく', '魔法しゅび']

/** URLに使う名前。日本語のままだと読みにくいのでローマ字にする */
const SLUG = {
  0: 'asobinin', 1: 'senshi', 2: 'butouka', 3: 'battlemaster',
  4: 'mahoutsukai', 5: 'souryo', 6: 'kenja', 7: 'yuusha',
  8: 'paladin', 9: 'mahousenshi', 10: 'ranger', 11: 'mamonotsukai',
  12: 'superstar', 13: 'haguremetal', 14: 'touzoku', 15: 'ninja',
  16: 'dougutsukai', 17: 'dougumaster'
}

/** スキルの種類を日本語にする */
const KIND = { stat: '能力', unlock: '解放', hissatsu: '必殺技' }

// ── 読み込み ──────────────────────────────────────────────
/** コメント行と空行を飛ばして、タブ区切りを配列で返す */
function rows(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.split('\t'))
}

/** 1行目を見出しとして読み、名前つきの形にする */
function table(path) {
  const [head, ...body] = rows(path)
  return body.map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])))
}

/** 盾の適正職業。MOD本体から取り出した数値が無ければこの節は出さない */
const EQUIP_PATH = join('scripts', 'data', 'equipment.json')
const EQUIP = existsSync(EQUIP_PATH) ? JSON.parse(readFileSync(EQUIP_PATH, 'utf8')) : { shields: {} }
const lang = JSON.parse(readFileSync(join(SRC, 'lang', 'ja_jp.json'), 'utf8'))
/** 盾のidから日本語名を引く */
function shieldName(key) {
  for (const k of [`item.dqmvi.${key}`, `item.dqmvi.legacy_item_${key}`]) {
    if (lang[k]) return String(lang[k]).replace(/^DQM\s+/, '').trim()
  }
  return key
}
/** 職業ID → その職業で構えられる盾（守備倍率の高い順） */
const shieldsByJob = new Map()
for (const [key, sp] of Object.entries(EQUIP.shields ?? {})) {
  for (const id of sp.職業 ?? []) {
    if (!shieldsByJob.has(id)) shieldsByJob.set(id, [])
    shieldsByJob.get(id).push({ name: shieldName(key), ...sp })
  }
}
for (const list of shieldsByJob.values()) list.sort((a, b) => (b.しゅび ?? 0) - (a.しゅび ?? 0))

const tables = rows(join(SRC, 'job_tables.tsv'))
const skills = table(join(SRC, 'job_skills.tsv'))

/** 表に出す並び順（エクセルの行順）。ゲーム内の職業一覧と同じ並びになる */
const order = (tables.find((r) => r[0] === 'order')?.[2] ?? '').split(',').map(Number)
const weaponRank = new Map(tables.filter((r) => r[0] === 'weapon').map((r) => [Number(r[1]), r[2].split(',')]))
const statRank = new Map(tables.filter((r) => r[0] === 'stat').map((r) => [Number(r[1]), r[2].split(',')]))

/** 職業ID → 名前 */
const jobName = new Map(skills.map((s) => [Number(s.job_id), s.job]))
/** 職業ID → 習得スキル（レベル順） */
const jobSkills = new Map()
for (const s of skills) {
  const id = Number(s.job_id)
  if (!jobSkills.has(id)) jobSkills.set(id, [])
  jobSkills.get(id).push(s)
}
for (const list of jobSkills.values()) list.sort((a, b) => Number(a.level) - Number(b.level))

// ── 書き出しの部品 ────────────────────────────────────────
/** 表のセルに入れると困る文字を逃がす */
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').trim() || '—'
const num = (v) => (Number(v) || 0).toLocaleString('ja-JP')
/** 倍率は2桁に丸める */
const mul = (v) => (v == null ? '—' : `×${Number(v).toFixed(2).replace(/\.?0+$/, '')}`)

/** すでにあるページから「## 攻略メモ」以降を取り出す */
function keptPart(path) {
  if (!existsSync(path)) return ''
  const text = readFileSync(path, 'utf8')
  const at = text.indexOf(KEEP_HEADING)
  if (at === -1) return ''
  const body = text.slice(at + KEEP_HEADING.length).trim()
  return body === EMPTY_NOTE ? '' : body
}

/** バニラ剣は全職業Bで差が出ないので、表からは省く */
const shownWeapons = WEAPONS.map((w, i) => [w, i]).filter(([w]) => w !== 'バニラ剣')

// ── 各職業のページ ────────────────────────────────────────
function jobPage(id) {
  const name = jobName.get(id)
  const st = statRank.get(id) ?? []
  const wp = weaponRank.get(id) ?? []
  const list = jobSkills.get(id) ?? []

  const lines = []
  lines.push('---')
  lines.push(`title: ${name}`)
  lines.push(`description: DQMVIの職業「${name}」のデータ。能力の伸び・武器適性・レベル別の習得スキル・必殺技。`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${name}`)
  lines.push('')
  const best = STATS.map((s, i) => [s, st[i]]).filter(([, r]) => r && /^S/.test(r)).map(([s]) => s)
  const goodWeapons = shownWeapons.filter(([, i]) => /^S/.test(wp[i] ?? '')).map(([w]) => w)
  const intro = []
  if (best.length) intro.push(`${best.join('・')}がよく伸びます`)
  if (goodWeapons.length) intro.push(`${goodWeapons.join('・')}が得意です`)
  lines.push(intro.length ? `${intro.join('。')}。` : '各能力・各武器とも標準的な職業です。')
  lines.push('')

  lines.push('## 能力の伸び')
  lines.push('')
  lines.push('```stats')
  STATS.forEach((s, i) => {
    const r = st[i] ?? '—'
    lines.push(`${s} | ${r}${/^S/.test(r) ? ' !' : ''}`)
  })
  lines.push('```')
  lines.push('')
  lines.push('ランクは SSS がいちばん高く、SS・S・A・B・C・D・E の順に下がります。')
  lines.push('')

  lines.push('## 武器の適性')
  lines.push('')
  lines.push('| 武器 | 適性 |')
  lines.push('| --- | :--: |')
  for (const [w, i] of shownWeapons) lines.push(`| ${cell(w)} | ${cell(wp[i])} |`)
  lines.push('')
  lines.push('Minecraftの剣は、どの職業でも B です。')
  lines.push('')

  lines.push('## 習得スキル')
  lines.push('')
  lines.push('「能力」は取ったあとずっと効果が続きます。SPは習得に必要なポイントです。')
  lines.push('')
  lines.push('| Lv | 種類 | 名前 | 効果 | SP |')
  lines.push('| ---: | :--: | --- | --- | ---: |')
  for (const s of list) {
    lines.push(`| ${num(s.level)} | ${KIND[s.kind] ?? s.kind} | ${cell(s.name)} | ${cell(s.desc)} | ${num(s.sp)} |`)
  }
  lines.push('')

  const shields = shieldsByJob.get(id) ?? []
  if (shields.length) {
    lines.push('## 構えられる盾')
    lines.push('')
    lines.push(`この職業で使える盾は **${shields.length}種** です。守備倍率の高い順に並べています。`)
    lines.push('')
    lines.push('| 盾 | しゅび | 魔法しゅび | 構え中 |')
    lines.push('| --- | ---: | ---: | ---: |')
    for (const s of shields) {
      lines.push(`| ${cell(s.name)} | ${mul(s.しゅび)} | ${mul(s.魔法しゅび)} | ${mul(s.構え中)} |`)
    }
    lines.push('')
    lines.push('盾は[オフハンドに持って右クリック長押し](/items/shields)で構えます。')
    lines.push('')
  }

  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [職業一覧](/jobs/)')
  if (shields.length) lines.push('- [盾一覧](/items/shields)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('')
  lines.push(KEEP_HEADING)
  lines.push('')
  const path = join(JOB_DIR, `${SLUG[id]}.md`)
  const kept = keptPart(path)
  return withExtraSections(lines.join('\n') + '\n' + (kept || EMPTY_NOTE) + '\n', path)
}

// ── 一覧ページ ────────────────────────────────────────────
function jobIndex() {
  const path = join(JOB_DIR, 'index.md')
  const extra = extraRows(path, new Set(order.map((id) => plainName(jobName.get(id)))))
  const lines = []
  lines.push('---')
  lines.push('title: 職業一覧')
  lines.push(`description: DQMVIの職業${order.length}種のデータ。能力の伸びと武器適性のランクを一覧で比べられます。`)
  lines.push('pageClass: wide-page')
  lines.push('---')
  lines.push('')
  lines.push('# 職業一覧')
  lines.push('')
  lines.push(`DQMVIの職業は **${order.length}種** です。名前を押すと、習得スキルや必殺技が見られます。`)
  lines.push('')
  lines.push('::: tip ランクの見かた')
  lines.push('SSS がいちばん高く、SS・S・A・B・C・D・E の順に下がります。')
  lines.push(':::')
  lines.push('')

  lines.push('## 能力の伸び')
  lines.push('')
  lines.push(`| 職業 | ${STATS.join(' | ')} |`)
  lines.push(`| --- | ${STATS.map(() => ':--:').join(' | ')} |`)
  for (const id of order) {
    const st = statRank.get(id) ?? []
    lines.push(`| [${cell(jobName.get(id))}](/jobs/${SLUG[id]}) | ${STATS.map((_, i) => cell(st[i])).join(' | ')} |`)
  }
  lines.push(...(extra.get('能力の伸び')?.rows ?? []))
  lines.push('')

  lines.push('## 武器の適性')
  lines.push('')
  lines.push(`| 職業 | ${shownWeapons.map(([w]) => w).join(' | ')} |`)
  lines.push(`| --- | ${shownWeapons.map(() => ':--:').join(' | ')} |`)
  for (const id of order) {
    const wp = weaponRank.get(id) ?? []
    lines.push(`| [${cell(jobName.get(id))}](/jobs/${SLUG[id]}) | ${shownWeapons.map(([, i]) => cell(wp[i])).join(' | ')} |`)
  }
  lines.push(...(extra.get('武器の適性')?.rows ?? []))
  lines.push('')
  lines.push('Minecraftの剣は、どの職業でも B です。')
  lines.push('')

  lines.push('## 必殺技')
  lines.push('')
  lines.push('職業ごとに2つあります。')
  lines.push('')
  lines.push('| 職業 | Lv | 必殺技 | 効果 |')
  lines.push('| --- | ---: | --- | --- |')
  for (const id of order) {
    for (const h of (jobSkills.get(id) ?? []).filter((s) => s.kind === 'hissatsu')) {
      lines.push(`| [${cell(jobName.get(id))}](/jobs/${SLUG[id]}) | ${num(h.level)} | ${cell(h.name)} | ${cell(h.desc)} |`)
    }
  }
  lines.push(...(extra.get('必殺技')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set(['能力の伸び', '武器の適性', '必殺技'])))

  lines.push('## 他の職業の呪文・特技を使う')
  lines.push('')
  const sample = (jobSkills.get(order[0]) ?? []).find((s) => s.kind === 'unlock')
  lines.push(`どの職業も **Lv${num(sample?.level ?? 100)}** で「その職業の魔法・特技」を覚えます。`)
  lines.push('これを取ると、別の職業に変えたあとでもその呪文と特技を使えます。')
  lines.push('ただし覚えるのは呪文と特技だけで、常にはたらくパッシブ効果は移りません。')
  lines.push('')
  lines.push('賢者だけは例外で、他の職業から使うと威力が75%になります。')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 書き出し ──────────────────────────────────────────────
if (!existsSync(JOB_DIR)) mkdirSync(JOB_DIR, { recursive: true })

let written = 0
for (const id of order) {
  if (!jobName.has(id)) continue
  writeFileSync(join(JOB_DIR, `${SLUG[id]}.md`), jobPage(id), 'utf8')
  written++
}
writeFileSync(join(JOB_DIR, 'index.md'), jobIndex(), 'utf8')

// 手書きで足された職業ページ（正式なファイル名でないもの）を title で突き合わせる
mergeHandwrittenPages(JOB_DIR, order.filter((id) => jobName.has(id)).map((id) => [jobName.get(id), SLUG[id]]))

console.log(`職業:     ${written}種`)
console.log(`必殺技:   ${skills.filter((s) => s.kind === 'hissatsu').length}個`)
console.log(`習得枠:   ${skills.length}件`)
console.log(`書き出し: ${written + 1}ファイル`)

recordCounts({ jobs: written })
