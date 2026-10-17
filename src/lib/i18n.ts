import { useApp } from './store'
import type { State } from './types'
export type Lang = State['lang']
export const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'ja', label: '日本語' }, { id: 'ro', label: 'Rōmaji' }]
// [en, ja, romaji]
const D = {
  home: ['Home', 'ホーム', 'Hōmu'], week: ['Week', '週間', 'Shūkan'], others: ['Others', 'みんな', 'Minna'],
  tasks: ['Tasks', 'タスク', 'Tasuku'], focus: ['Focus', '集中', 'Shūchū'], you: ['You', 'あなた', 'Anata'],
  gm: ['Good morning', 'おはよう', 'Ohayō'], ga: ['Good afternoon', 'こんにちは', 'Konnichiwa'], ge: ['Good evening', 'こんばんは', 'Konbanwa'],
  now: ['Happening now', 'いま', 'Ima'], next: ['Up next', 'つぎ', 'Tsugi'], nothing: ['Nothing scheduled', '予定なし', 'Yotei nashi'],
  endsIn: ['ends in {x}', 'あと{x}で終了', 'ato {x} de shūryō'], inX: ['in {x}', '{x}後', '{x} go'], tomorrow: ['Tomorrow', 'あした', 'Ashita'],
  rest: ['Enjoy the break', 'ゆっくり休もう', 'Yukkuri yasumō'], open: ['open tasks', '未完了タスク', 'mikanryō tasuku'],
  start: ['start a focus round', '集中を始める', 'shūchū o hajimeru'], today: ['Today', 'きょう', 'Kyō'],
  classes: ['{n} classes', '{n}コマ', '{n} koma'], none: ['No classes today', '今日は授業なし', 'Kyō wa jugyō nashi'],
  welcome: ['Welcome to Otomo', 'Otomoへようこそ', 'Otomo e yōkoso'], setup: ["Let's set up your week.", '一週間を整えよう。', 'Isshūkan o totonoeyō.'],
  name: ['Your name', '名前', 'Namae'], group: ['Group', 'グループ', 'Gurūpu'], section: ['Section', 'セクション', 'Sekushon'],
  go: ['Open my week', '週間を開く', 'Shūkan o hiraku'],
  note: ['You can change these later in Settings. Nothing leaves your device.', '設定であとから変更できます。データは端末の外に出ません。', 'Settei de ato kara henkō dekimasu. Dēta wa tanmatsu no soto ni demasen.'],
  kicker: ['Stored only on this device', 'この端末にのみ保存', 'Kono tanmatsu ni nomi hozon'], youT: ['You.', 'あなた。', 'Anata.'],
  lang: ['Language', '言語', 'Gengo'], toLight: ['Switch to paper', '和紙モードへ', 'Washi mōdo e'], toDark: ['Switch to ink', '墨モードへ', 'Sumi mōdo e'],
  reset: ['Reset tasks & events', 'タスクと予定をリセット', 'Tasuku to yotei o risetto'],
  confirm: ['Clear your tasks and personal events on this device?', 'この端末のタスクと予定を消去しますか？', 'Kono tanmatsu no tasuku to yotei o shōkyo shimasu ka?'],
  exp: ['Back up my data', 'データをバックアップ', 'Dēta o bakkuappu'], imp: ['Restore from backup', 'バックアップから復元', 'Bakkuappu kara fukugen'],
  bad: ['That file is not an Otomo backup.', 'Otomoのバックアップではありません。', 'Otomo no bakkuappu dewa arimasen.'],
  load: ['Loading…', '読み込み中…', 'Yomikomi-chū…'], fail: ['Could not load the timetable. Check your connection.', '時間割を読み込めません。接続を確認してください。', 'Jikanwari o yomikomemasen. Setsuzoku o kakunin shite kudasai.']
} as const
export type K = keyof typeof D
const IDX = { en: 0, ja: 1, ro: 2 } as const
export const tr = (l: Lang, k: K, v: Record<string, string | number> = {}) =>
  D[k][IDX[l]].replace(/\{(\w+)\}/g, (_, n) => String(v[n]))
export function useT() { const { s } = useApp(); return (k: K, v?: Record<string, string | number>) => tr(s.lang, k, v) }
export const dateLoc = (l: Lang) => (l === 'ja' ? 'ja-JP' : 'en-GB')
