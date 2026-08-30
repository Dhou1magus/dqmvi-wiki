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
