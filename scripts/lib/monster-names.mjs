/**
 * MOD の表記を wiki 側で直すモンスター名。id → wiki に出す名前。
 *
 * 名前はふだん lang（item.dqmvi.<id>_spawn_egg）から引くが、よっしーが GitHub 上で
 * ページの名前を直したものはここに入れて、図鑑・出現場所・系統・逆引きの全部に効かせる
 * （ページだけ直しても、次の再生成で lang の表記に戻ってしまうため）。
 * gen-monster-pages.mjs と gen-drop-pages.mjs の両方が通す。
 */
export const MONSTER_NAME_FIX = new Map([
  // lang は「キラーマシーン」。2026-09-05 に本人がページを「キラーマシン」に直した（9ef2f02）
  ['kiramasin', 'キラーマシン']
])

/** lang から引いた名前に、上の直しを当てる */
export function fixMonsterName(id, name) {
  return MONSTER_NAME_FIX.get(id) ?? name
}
