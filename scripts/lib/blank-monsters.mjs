/**
 * 中身を空欄にするモンスター（scripts/data/monster-blank.json の id）。
 * 名前と図鑑No.だけ残し、ステータス・生態・ドロップ品・呪文・出現場所を空にする。
 * ドロップ品の逆引き・系統・出現場所の一覧にも出さない。
 * gen-monster-pages / gen-drop-pages / gen-item-pages の3つが読む。片方だけで判定しないこと。
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PATH = join('scripts', 'data', 'monster-blank.json')
export const BLANK_MONSTERS = new Set(
  existsSync(PATH) ? Object.keys(JSON.parse(readFileSync(PATH, 'utf8')).monsters ?? {}) : []
)
