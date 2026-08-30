/**
 * ご意見箱の設定。
 *
 * ★書き換えるのはこのファイルだけです。
 */

/**
 * Googleフォームの埋め込みURL。
 *
 * 出し方: Googleフォームを開く → 右上の「送信」→ < > のタブ →
 *         出てきた文の中の src="..." の中身（https://docs.google.com/... で始まる部分）
 *
 * 空のままだと、ご意見箱のページは「準備中」と表示されます。
 * docs.google.com 以外のURLは安全のため読み込みません。
 */
export const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd8Yf_N0-IGD7ABsbOOHrO6YTvKqkhCickYqA-ZoqDTWKS-eA/viewform?embedded=true'

/** 同じ人が続けて投稿できないようにする時間（分） */
export const FEEDBACK_COOLDOWN_MINUTES = 10

/**
 * フォームを表示する枠の高さ（px）。
 *
 * 別サイトの中身なので、こちらからは実際の高さを測れない。短すぎると
 * フォームの中にスクロールバーが出るので、少し余裕をもたせてある。
 * フォームの質問を増やしたときは、この数値も増やすこと。
 *
 * 目安: 現在の3問で、実際の中身は パソコン約1030px / スマホ約1190px。
 * 「その他」を選ぶと入力欄が増えるぶん、さらに伸びる。
 */
export const FEEDBACK_FORM_HEIGHT = 1130
export const FEEDBACK_FORM_HEIGHT_NARROW = 1320
