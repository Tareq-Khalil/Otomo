export type PhraseDifficulty = 'N5' | 'N4' | 'N3' | 'Colloquial'
export type PhraseCategory = 'campus' | 'study' | 'coding' | 'daily' | 'social' | 'nuance'

export interface DialogueLine {
  speaker: string
  jp: string
  romaji: string
  en: string
}

export type PhraseChallenge =
  | {
      type: 'meaning'
      prompt: string
      choices: string[]
      answer: string
      feedbackCorrect: string
      feedbackWrong: string
    }
  | {
      type: 'reply'
      prompt: string
      situation: string
      choices: { jp: string; romaji: string; en: string }[]
      answerIndex: number
      feedbackCorrect: string
      feedbackWrong: string
    }
  | {
      type: 'nuance'
      prompt: string
      choices: string[]
      answer: string
      feedbackCorrect: string
      feedbackWrong: string
    }

export interface JapanesePhrase {
  id: string
  japanese: string
  kana: string
  romaji: string
  english: string
  arabic: string
  difficulty: PhraseDifficulty
  category: PhraseCategory
  otomoIntro: string
  context: string
  dialogue: DialogueLine[]
  tip: string
  variation?: { label: string; jp: string; romaji: string }
  challenge: PhraseChallenge
}

export const JAPANESE_PHRASES: JapanesePhrase[] = [
  {
    id: 'naruhodo',
    japanese: 'なるほど',
    kana: 'なるほど',
    romaji: 'Naruhodo',
    english: 'I see; that makes sense',
    arabic: 'فهمت؛ هذا منطقي',
    difficulty: 'N5',
    category: 'study',
    otomoIntro: 'Useful when someone explains an algorithm for the third time and it finally clicks.',
    context: 'Used among peers or casually when something suddenly makes sense.',
    dialogue: [
      { speaker: 'Classmate', jp: 'このループは O(log n) だよ。', romaji: 'Kono rūpu wa O(log n) da yo.', en: 'This loop is O(log n).' },
      { speaker: 'You', jp: 'ああ、なるほど！', romaji: 'Aa, naruhodo!', en: 'Oh, I see!' }
    ],
    tip: 'Avoid saying なるほど directly to professors or superiors — it can sound like you are evaluating their explanation. Use 「よく分かりました」 (Yoku wakarimashita) instead.',
    variation: { label: 'Polite to a professor', jp: 'よく分かりました', romaji: 'Yoku wakarimashita' },
    challenge: {
      type: 'nuance',
      prompt: 'Your professor finishes explaining a proof. Should you reply with 「なるほど」?',
      choices: [
        'No — it sounds slightly condescending to superiors; say よく分かりました',
        'Yes — it is the most formal way to thank a professor',
        'Only if you want to ask for an extension'
      ],
      answer: 'No — it sounds slightly condescending to superiors; say よく分かりました',
      feedbackCorrect: 'Exactly. Save なるほど for classmates and friends.',
      feedbackWrong: 'Careful — なるほど sounds like "hmm, fair point," which is too casual for professors.'
    }
  },
  {
    id: 'otsukaresama',
    japanese: 'お疲れさまです',
    kana: 'おつかれさまです',
    romaji: 'Otsukaresama desu',
    english: 'Thanks for your hard work',
    arabic: 'يعطيك العافية / شكراً على مجهودك',
    difficulty: 'N5',
    category: 'campus',
    otomoIntro: 'The backbone of Japanese campus and lab culture. You will hear this ten times a day.',
    context: 'Said when greeting teammates, leaving a lab, or wrapping up a group study session.',
    dialogue: [
      { speaker: 'Teammate', jp: '今日の実験、終わったよ。', romaji: 'Kyō no jikken, owatta yo.', en: "Today's lab is done." },
      { speaker: 'You', jp: 'お疲れさまです！', romaji: 'Otsukaresama desu!', en: 'Thanks for your hard work!' }
    ],
    tip: 'There is no single English equivalent — in Arabic, 「يعطيك العافية」 captures the exact warmth and acknowledgment of effort.',
    variation: { label: 'Casual with close friends', jp: 'お疲れ！', romaji: 'Otsukare!' },
    challenge: {
      type: 'reply',
      prompt: 'Your lab partner just finished debugging the circuit after an hour. What do you say?',
      situation: 'Wrapping up a long lab session together.',
      choices: [
        { jp: 'お疲れさまです！', romaji: 'Otsukaresama desu!', en: 'Thanks for your hard work!' },
        { jp: 'はじめまして。', romaji: 'Hajimemashite.', en: 'Nice to meet you.' },
        { jp: 'おやすみなさい。', romaji: 'Oyasuminasai.', en: 'Good night.' }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Spot on. Every tired engineer appreciates an お疲れさまです.',
      feedbackWrong: 'Not quite — after shared effort, お疲れさまです is the natural response.'
    }
  },
  {
    id: 'chotto-matte',
    japanese: 'ちょっと待ってください',
    kana: 'ちょっとまってください',
    romaji: 'Chotto matte kudasai',
    english: 'Please wait a moment',
    arabic: 'انتظر لحظة من فضلك',
    difficulty: 'N5',
    category: 'daily',
    otomoIntro: 'For when the slide changes before you finished copying the last equation.',
    context: 'Polite request to pause or hold on for a brief moment.',
    dialogue: [
      { speaker: 'Friend', jp: 'もう行こうか？', romaji: 'Mō ikō ka?', en: 'Shall we head out now?' },
      { speaker: 'You', jp: 'ちょっと待ってください、ノートを片付けます。', romaji: 'Chotto matte kudasai, nōto o katazukemasu.', en: 'Wait a moment, I am packing my notebook.' }
    ],
    tip: 'With close friends, drop ください and say 「ちょっと待って」 (Chotto matte).',
    variation: { label: 'Casual', jp: 'ちょっと待って', romaji: 'Chotto matte' },
    challenge: {
      type: 'meaning',
      prompt: 'What does 「ちょっと待ってください」 mean?',
      choices: ['Please wait a moment', 'Please speak slower', 'Please come here'],
      answer: 'Please wait a moment',
      feedbackCorrect: 'Correct. ちょっと (a little) + 待ってください (please wait).',
      feedbackWrong: 'Not that one — 待って comes from 待つ (matsu), "to wait".'
    }
  },
  {
    id: 'muri-shinaide',
    japanese: '無理しないでね',
    kana: 'むりしないでね',
    romaji: 'Muri shinaide ne',
    english: "Don't push yourself too hard",
    arabic: 'لا ترهق نفسك كثيراً',
    difficulty: 'N4',
    category: 'social',
    otomoIntro: 'I say this when I see someone opening their fourth energy drink before midnight.',
    context: 'Gentle, caring reminder to someone working or studying too hard.',
    dialogue: [
      { speaker: 'Friend', jp: '今夜、徹夜でレポート書くんだ。', romaji: 'Konya, tetsuya de repōto kakun da.', en: "I'm pulling an all-nighter for the report tonight." },
      { speaker: 'Otomo', jp: '無理しないでね。', romaji: 'Muri shinaide ne.', en: "Don't overdo it, okay?" }
    ],
    tip: '無理 (muri) means "impossible / unreasonable." Doing 無理 means forcing yourself beyond your limits.',
    variation: { label: 'Polite', jp: 'ご無理なさらないでください', romaji: 'Go-muri nasaranaide kudasai' },
    challenge: {
      type: 'meaning',
      prompt: 'When a friend says 「無理しないでね」, what are they telling you?',
      choices: ["Don't push yourself too hard", 'You have no choice', 'Do it faster'],
      answer: "Don't push yourself too hard",
      feedbackCorrect: 'Yes. Take the hint and actually rest when needed.',
      feedbackWrong: 'Actually, it is a caring phrase meaning "don’t overexert yourself."'
    }
  },
  {
    id: 'tasukatta',
    japanese: '助かりました',
    kana: 'たすかりました',
    romaji: 'Tasukarimashita',
    english: 'That really helped me out; you saved me',
    arabic: 'لقد أنقذتني / ساعدتني كثيراً',
    difficulty: 'N4',
    category: 'social',
    otomoIntro: 'More genuine than a plain "thank you" when someone shares their lecture notes right before a quiz.',
    context: 'Expresses relief and gratitude when someone helps you out of a tough spot.',
    dialogue: [
      { speaker: 'Classmate', jp: '昨日のノート、送っておいたよ。', romaji: 'Kinō no nōto, okutte oita yo.', en: "I sent you yesterday's notes." },
      { speaker: 'You', jp: '本当に助かりました！', romaji: 'Hontō ni tasukarimashita!', en: 'You really saved me!' }
    ],
    tip: 'Comes from 助かる (tasukaru, "to be saved/helped"). Native speakers use it constantly when thanking someone for practical help.',
    variation: { label: 'Casual', jp: '助かった！', romaji: 'Tasukatta!' },
    challenge: {
      type: 'reply',
      prompt: 'A teammate fixes a merge conflict that was blocking your submission. How do you express relief + thanks?',
      situation: '5 minutes before the deadline.',
      choices: [
        { jp: '本当に助かりました！', romaji: 'Hontō ni tasukarimashita!', en: 'You really saved me!' },
        { jp: 'どういたしまして。', romaji: 'Dōitashimashite.', en: "You're welcome." },
        { jp: 'わかりません。', romaji: 'Wakarimasen.', en: "I don't understand." }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Perfect. 「助かりました」 carries both relief and gratitude.',
      feedbackWrong: 'Try 「本当に助かりました！」 — literally "I was saved!"'
    }
  },
  {
    id: 'ki-ni-shinaide',
    japanese: '気にしないで',
    kana: 'きにしないで',
    romaji: 'Ki ni shinaide',
    english: "Don't worry about it; never mind",
    arabic: 'لا تقلق بشأن ذلك / لا بأس',
    difficulty: 'N4',
    category: 'social',
    otomoIntro: 'Handy when someone apologizes for a tiny typo in a group chat.',
    context: 'Used to reassure someone who apologized for a small mistake.',
    dialogue: [
      { speaker: 'Friend', jp: 'ごめん、ちょっと遅れちゃった。', romaji: 'Gomen, chotto okurechatta.', en: 'Sorry, I ended up a bit late.' },
      { speaker: 'You', jp: 'いいよ、気にしないで！', romaji: 'Ii yo, ki ni shinaide!', en: "It's fine, don't worry about it!" }
    ],
    tip: '気 (ki) is mind/spirit; 気にする means "to mind / to worry about." Negating it with ないで makes it reassuring.',
    variation: { label: 'Polite', jp: 'お気になさらないでください', romaji: 'O-ki ni nasaranaide kudasai' },
    challenge: {
      type: 'meaning',
      prompt: 'What does 「気にしないで」 mean?',
      choices: ["Don't worry about it", 'Pay close attention', 'I forgot'],
      answer: "Don't worry about it",
      feedbackCorrect: 'Right! Smooth and reassuring.',
      feedbackWrong: 'Not quite — 気にする means to fret over something, so 気にしないで means "don’t mind it."'
    }
  },
  {
    id: 'mou-ichido',
    japanese: 'もう一度お願いします',
    kana: 'もういちどおねがいします',
    romaji: 'Mō ichido onegaishimasu',
    english: 'One more time, please',
    arabic: 'مرة أخرى من فضلك',
    difficulty: 'N5',
    category: 'campus',
    otomoIntro: 'Zero shame in using this. Better to ask once than guess wrong on the midterm.',
    context: 'Polite way to ask someone to repeat what they just said or explained.',
    dialogue: [
      { speaker: 'You', jp: 'すみません、もう一度お願いします。', romaji: 'Sumimasen, mō ichido onegaishimasu.', en: 'Excuse me, one more time please.' },
      { speaker: 'TA', jp: 'もちろん、ここから説明するね。', romaji: 'Mochiron, koko kara setsumei suru ne.', en: "Of course, I'll explain from here." }
    ],
    tip: 'Add 「すみません」(Sumimasen) at the start to soften the request.',
    challenge: {
      type: 'meaning',
      prompt: 'When would you say 「もう一度お願いします」?',
      choices: [
        'When you need someone to repeat or say something again',
        'When you want to leave early',
        'When you are ordering coffee for a friend'
      ],
      answer: 'When you need someone to repeat or say something again',
      feedbackCorrect: 'Correct. もう一度 = one more time.',
      feedbackWrong: 'もう一度 (mō ichido) literally means "one more time."'
    }
  },
  {
    id: 'shitsumon',
    japanese: '質問があります',
    kana: 'しつもんがあります',
    romaji: 'Shitsumon ga arimasu',
    english: 'I have a question',
    arabic: 'لدي سؤال',
    difficulty: 'N5',
    category: 'campus',
    otomoIntro: 'Simple, clear, and works in any lecture hall.',
    context: 'Standard polite phrase to raise your hand and ask a question in class.',
    dialogue: [
      { speaker: 'You', jp: '先生、質問があります。', romaji: 'Sensei, shitsumon ga arimasu.', en: 'Professor, I have a question.' },
      { speaker: 'Sensei', jp: 'はい、どうぞ。', romaji: 'Hai, dōzo.', en: 'Yes, go ahead.' }
    ],
    tip: 'If you want to sound extra polite: 「質問してもいいですか？」 (May I ask a question?).',
    variation: { label: 'Softer', jp: '質問してもいいですか', romaji: 'Shitsumon shite mo ii desu ka' },
    challenge: {
      type: 'reply',
      prompt: 'The TA asks if anyone is confused about the lab instructions. How do you raise your hand politely?',
      situation: 'During a tutorial session.',
      choices: [
        { jp: 'すみません、質問があります。', romaji: 'Sumimasen, shitsumon ga arimasu.', en: 'Excuse me, I have a question.' },
        { jp: 'お疲れさまでした。', romaji: 'Otsukaresama deshita.', en: 'Thank you for your work.' },
        { jp: 'お先に失礼します。', romaji: 'Osaki ni shitsurei shimasu.', en: 'Excuse me for leaving first.' }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Clean and polite. 質問 (shitsumon) = question.',
      feedbackWrong: 'The word for question is 質問 (shitsumon).'
    }
  },
  {
    id: 'yappari',
    japanese: 'やっぱり',
    kana: 'やっぱり',
    romaji: 'Yappari',
    english: 'I knew it; as I thought; after all',
    arabic: 'كما توقعت / في النهاية',
    difficulty: 'N4',
    category: 'nuance',
    otomoIntro: 'My favorite word when you ignore a semicolon and the compiler confirms your worst suspicion.',
    context: 'Expresses that a suspicion was right, or that you reverted to your original choice.',
    dialogue: [
      { speaker: 'You', jp: 'あ、やっぱりセミコロンを忘れてた。', romaji: 'A, yappari semikoron o wasureteta.', en: 'Ah, I knew it — I forgot a semicolon.' }
    ],
    tip: '「やはり」(yahari) is the slightly more formal version; 「やっぱり」(yappari) is everyday speech.',
    variation: { label: 'Formal / written', jp: 'やはり', romaji: 'Yahari' },
    challenge: {
      type: 'nuance',
      prompt: 'You suspected your code failed because of an off-by-one bug, and checking the logs confirms it. Which word fits?',
      choices: ['やっぱり (Yappari)', 'はじめまして (Hajimemashite)', 'お大事に (Odaiji ni)'],
      answer: 'やっぱり (Yappari)',
      feedbackCorrect: 'Classic やっぱり moment. Instincts confirmed.',
      feedbackWrong: 'やっぱり means "as I suspected / I knew it!"'
    }
  },
  {
    id: 'maa-ii-ka',
    japanese: 'まあ、いいか',
    kana: 'まあ、いいか',
    romaji: 'Mā, ii ka',
    english: 'Oh well, it’s fine; whatever works',
    arabic: 'حسناً، لا بأس / ليكن',
    difficulty: 'Colloquial',
    category: 'daily',
    otomoIntro: 'When your CSS centers slightly off by 1px and you decide to choose peace.',
    context: 'Self-talk or casual acceptance when something isn’t perfect but good enough.',
    dialogue: [
      { speaker: 'Friend', jp: '傘を忘れちゃった。', romaji: 'Kasa o wasurechatta.', en: 'I forgot my umbrella.' },
      { speaker: 'You', jp: '小雨だし、まあ、いいか。', romaji: 'Kosame da shi, mā, ii ka.', en: "It's just a drizzle, oh well." }
    ],
    tip: 'Great for sounding natural in casual Japanese — just don’t say it about a failing grade.',
    challenge: {
      type: 'meaning',
      prompt: 'What feeling does 「まあ、いいか」 express?',
      choices: ['Casual acceptance ("oh well, fine")', 'Extreme urgency', 'Deep apology'],
      answer: 'Casual acceptance ("oh well, fine")',
      feedbackCorrect: 'Exactly. Acceptance and moving on.',
      feedbackWrong: 'It’s a relaxed "oh well, it’s fine."'
    }
  },
  {
    id: 'ippo-ippo',
    japanese: '一歩一歩',
    kana: 'いっぽいっぽ',
    romaji: 'Ippo ippo',
    english: 'Step by step',
    arabic: 'خطوة بخطوة',
    difficulty: 'N4',
    category: 'study',
    otomoIntro: 'Not glamorous, but it finishes every syllabus.',
    context: 'Encouragement to take steady, manageable steps instead of panicking over the whole workload.',
    dialogue: [
      { speaker: 'You', jp: '範囲が広すぎるよ…', romaji: 'Han’i ga hirosugiru yo…', en: 'The exam scope is way too huge…' },
      { speaker: 'Otomo', jp: '焦らないで、一歩一歩進もう。', romaji: 'Aseranaide, ippo ippo susumō.', en: "Don't panic — let's move forward step by step." }
    ],
    tip: '一歩 (ippo) = one step. Repeating it creates the adverb "step by step."',
    challenge: {
      type: 'meaning',
      prompt: 'What does 「一歩一歩」 mean?',
      choices: ['Step by step', 'All at once', 'Right away'],
      answer: 'Step by step',
      feedbackCorrect: 'Yes! One step at a time.',
      feedbackWrong: '歩 (ho/po) means step, so 一歩一歩 is "step by step."'
    }
  },
  {
    id: 'shikkari',
    japanese: 'しっかりして！',
    kana: 'しっかりして！',
    romaji: 'Shikkari shite!',
    english: 'Pull yourself together! / Stay focused!',
    arabic: 'تماسك! / ركّز!',
    difficulty: 'N4',
    category: 'study',
    otomoIntro: 'What I mentally tell you when you stare at the same textbook paragraph for ten minutes.',
    context: 'Playful or firm nudge to snap out of distraction and focus.',
    dialogue: [
      { speaker: 'You', jp: 'もう眠い…', romaji: 'Mō nemui…', en: "I'm already sleepy…" },
      { speaker: 'Friend', jp: 'あと一問だけ！しっかりして！', romaji: 'Ato ichimon dake! Shikkari shite!', en: 'Just one more problem! Stay sharp!' }
    ],
    tip: 'Can also be encouraging without being harsh, depending on tone.',
    challenge: {
      type: 'reply',
      prompt: 'Your study buddy is zoning out right before the last practice question. What gives them a friendly nudge?',
      situation: 'Late afternoon study session.',
      choices: [
        { jp: 'しっかりして！あと少しだよ。', romaji: 'Shikkari shite! Ato sukoshi da yo.', en: 'Stay focused! Almost there.' },
        { jp: 'ごちそうさまでした。', romaji: 'Gochisōsama deshita.', en: 'Thanks for the meal.' },
        { jp: 'お元気ですか。', romaji: 'O-genki desu ka.', en: 'How are you?' }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Nice! Direct, motivating, and natural.',
      feedbackWrong: 'しっかりして！ means "stay sharp / pull yourself together!"'
    }
  },
  {
    id: 'kibun-tenkan',
    japanese: '気分転換',
    kana: 'きぶんてんかん',
    romaji: 'Kibun tenkan',
    english: 'A change of pace; refreshing one’s mood',
    arabic: 'تغيير جو / تجديد النشاط',
    difficulty: 'N3',
    category: 'study',
    otomoIntro: 'Scientific justification for taking a 10-minute walk instead of doomscrolling.',
    context: 'Taking a short break or changing your environment to clear your head.',
    dialogue: [
      { speaker: 'You', jp: 'ずっと部屋にいて頭が重い。', romaji: 'Zutto heya ni ite atama ga omoi.', en: "I've been in my room too long and my head feels heavy." },
      { speaker: 'Otomo', jp: '気分転換に少し歩いたら？', romaji: 'Kibun tenkan ni sukoshi aruitara?', en: 'Why not walk a bit for a change of pace?' }
    ],
    tip: '気分 (mood/feeling) + 転換 (switch/shift). Very common in everyday conversation.',
    challenge: {
      type: 'meaning',
      prompt: 'What is 「気分転換」?',
      choices: ['A change of pace to refresh your mood', 'A strict exam rule', 'A heavy workload'],
      answer: 'A change of pace to refresh your mood',
      feedbackCorrect: 'Correct! Literally "switching your mood."',
      feedbackWrong: '気分 = mood, 転換 = shift/change — so "a change of pace."'
    }
  },
  {
    id: 'sasuga',
    japanese: 'さすが！',
    kana: 'さすが！',
    romaji: 'Sasuga!',
    english: 'As expected of you! / Impressive!',
    arabic: 'كما هو متوقع منك! / رائع!',
    difficulty: 'N4',
    category: 'social',
    otomoIntro: 'Use this when your friend solves the bonus question in 30 seconds.',
    context: 'Complimenting someone for living up to their reputation or skill.',
    dialogue: [
      { speaker: 'Friend', jp: 'バグの原因、見つけたよ。', romaji: 'Bagu no gen’in, mitsuketa yo.', en: 'Found the cause of the bug.' },
      { speaker: 'You', jp: 'さすが！', romaji: 'Sasuga!', en: 'Impressive, as expected!' }
    ],
    tip: 'Only use it to praise — never sarcastically unless you are very close friends.',
    challenge: {
      type: 'meaning',
      prompt: 'When someone says 「さすが！」 to you, they are:',
      choices: ['Praising you ("impressive, as expected!")', 'Asking you to repeat', 'Saying goodbye'],
      answer: 'Praising you ("impressive, as expected!")',
      feedbackCorrect: 'Yes! One of the best compliments in Japanese.',
      feedbackWrong: 'さすが means "as expected of someone capable / impressive!"'
    }
  },
  {
    id: 'shoganai',
    japanese: 'しょうがない',
    kana: 'しょうがない',
    romaji: 'Shō ga nai',
    english: 'It can’t be helped; nothing we can do about it',
    arabic: 'لا حيلة لنا / هذا ما حدث',
    difficulty: 'N4',
    category: 'nuance',
    otomoIntro: 'The official motto when the campus Wi-Fi drops right as you hit submit.',
    context: 'Accepting an unchangeable situation calmly instead of dwelling on it.',
    dialogue: [
      { speaker: 'Friend', jp: 'バス、行っちゃったね。', romaji: 'Basu, itchatta ne.', en: 'The bus already left.' },
      { speaker: 'You', jp: 'しょうがない、次のを待とう。', romaji: 'Shō ga nai, tsugi no o matō.', en: "Can't be helped, let's wait for the next one." }
    ],
    tip: 'Slightly more formal: 「仕方ない」 (Shikata nai) or 「仕方がありません」 (Shikata ga arimasen).',
    variation: { label: 'Polite', jp: '仕方がありません', romaji: 'Shikata ga arimasen' },
    challenge: {
      type: 'nuance',
      prompt: 'It suddenly rains after you already left without an umbrella. Which phrase fits?',
      choices: ['しょうがない (It can’t be helped)', 'おめでとう (Congratulations)', 'いただきます (Before eating)'],
      answer: 'しょうがない (It can’t be helped)',
      feedbackCorrect: 'Spot on. Accept it and move forward.',
      feedbackWrong: 'しょうがない expresses calm acceptance when something cannot be changed.'
    }
  },
  {
    id: 'osaki-ni',
    japanese: 'お先に失礼します',
    kana: 'おさきにしつれいします',
    romaji: 'Osaki ni shitsurei shimasu',
    english: 'Excuse me for leaving before you',
    arabic: 'أستأذن بالانصراف قبلكم',
    difficulty: 'N4',
    category: 'campus',
    otomoIntro: 'Polite exit line when you finish your lab early while everyone else is still wiring breadboards.',
    context: 'Said when leaving a study room, lab, or office while others are still working.',
    dialogue: [
      { speaker: 'You', jp: '終わったので、お先に失礼します。', romaji: 'Owatta node, osaki ni shitsurei shimasu.', en: "I'm done, so excuse me for leaving first." },
      { speaker: 'Teammate', jp: 'お疲れさま！また明日。', romaji: 'Otsukaresama! Mata ashita.', en: 'Good work! See you tomorrow.' }
    ],
    tip: 'They will almost always reply with 「お疲れさまです！」.',
    challenge: {
      type: 'reply',
      prompt: 'You finished your part in the library, while your friends are still studying. What do you say as you pack up?',
      situation: 'Leaving the study table.',
      choices: [
        { jp: 'お先に失礼します。', romaji: 'Osaki ni shitsurei shimasu.', en: 'Excuse me for leaving first.' },
        { jp: 'お邪魔します。', romaji: 'Ojama shimasu.', en: 'Excuse me for intruding (when entering).' },
        { jp: 'いらっしゃいませ。', romaji: 'Irasshaimase.', en: 'Welcome (shop greeting).' }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Polite and natural. お先に = ahead of you.',
      feedbackWrong: 'Use 「お先に失礼します」 when leaving before others.'
    }
  },
  {
    id: 'yukkuri',
    japanese: 'ゆっくり休んでね',
    kana: 'ゆっくりやすんでね',
    romaji: 'Yukkuri yasunde ne',
    english: 'Get some good rest',
    arabic: 'ارتَح جيداً',
    difficulty: 'N5',
    category: 'daily',
    otomoIntro: 'Rare advice from a productivity app, I know. Take it anyway.',
    context: 'Warm wish to someone who is tired, sick, or finished with exams.',
    dialogue: [
      { speaker: 'Friend', jp: 'やっとテスト全部終わった！', romaji: 'Yatto tesuto zenbu owatta!', en: 'Finally finished all the exams!' },
      { speaker: 'You', jp: 'お疲れさま！今日はゆっくり休んでね。', romaji: 'Otsukaresama! Kyō wa yukkuri yasunde ne.', en: 'Great work! Get plenty of rest today.' }
    ],
    tip: 'ゆっくり means "slowly / at ease / leisurely."',
    challenge: {
      type: 'meaning',
      prompt: 'What does 「ゆっくり休んでね」 mean?',
      choices: ['Get some good rest', 'Hurry up', 'Wake up early'],
      answer: 'Get some good rest',
      feedbackCorrect: 'Correct! Rest is part of studying well.',
      feedbackWrong: '休む (yasumu) means "to rest," and ゆっくり means "leisurely / well."'
    }
  },
  {
    id: 'daijobu',
    japanese: '大丈夫ですよ',
    kana: 'だいじょうぶですよ',
    romaji: 'Daijōbu desu yo',
    english: "It's okay; no problem at all",
    arabic: 'لا بأس، الأمر بخير',
    difficulty: 'N5',
    category: 'daily',
    otomoIntro: 'The Swiss Army knife of Japanese. Works for "I’m fine," "No thanks," and "Don’t worry."',
    context: 'Reassuring someone or politely declining/confirming everything is alright.',
    dialogue: [
      { speaker: 'Friend', jp: 'これ、重くない？持とうか？', romaji: 'Kore, omokunai? Motō ka?', en: "Isn't this heavy? Shall I carry it?" },
      { speaker: 'You', jp: 'あ、大丈夫ですよ。ありがとう！', romaji: 'A, daijōbu desu yo. Arigatō!', en: "Oh, I'm fine. Thanks!" }
    ],
    tip: 'Tone matters: rising intonation (大丈夫？) asks "Are you okay?", falling intonation reassures "I’m/It’s fine."',
    challenge: {
      type: 'nuance',
      prompt: 'In a café, the staff asks if you want a receipt, and you don’t need one. Can 「大丈夫です」 work?',
      choices: [
        'Yes — in casual/everyday Japanese it politely means "No thanks, I’m good"',
        'No — it only means "I am injured"',
        'Only if you are asking for the bill'
      ],
      answer: 'Yes — in casual/everyday Japanese it politely means "No thanks, I’m good"',
      feedbackCorrect: 'Right! Just pair it with a slight nod or smile.',
      feedbackWrong: 'In modern spoken Japanese, 大丈夫です is frequently used for "I’m good / no thank you."'
    }
  },
  {
    id: 'wasurechatta',
    japanese: '忘れちゃった',
    kana: 'わすれちゃった',
    romaji: 'Wasurechatta',
    english: 'Oops, I completely forgot',
    arabic: 'أوه، لقد نسيت تماماً',
    difficulty: 'Colloquial',
    category: 'coding',
    otomoIntro: 'Me watching you close the documentation tab and immediately forget the function signature.',
    context: 'Casual way to admit you accidentally forgot something.',
    dialogue: [
      { speaker: 'Friend', jp: '今日の課題、提出した？', romaji: 'Kyō no kadai, teishutsu shita?', en: "Did you submit today's assignment?" },
      { speaker: 'You', jp: 'やばい、忘れちゃった！', romaji: 'Yabai, wasurechatta!', en: 'Oh no, I completely forgot!' }
    ],
    tip: '～ちゃった comes from ～てしまった, showing something happened accidentally or with a bit of regret.',
    variation: { label: 'Polite', jp: '忘れてしまいました', romaji: 'Wasurete shimaimashita' },
    challenge: {
      type: 'meaning',
      prompt: 'What nuance does the 「〜ちゃった」 ending add to 「忘れちゃった」?',
      choices: [
        'That you forgot accidentally / with a bit of "oops"',
        'That you forgot on purpose',
        'That you will remember tomorrow'
      ],
      answer: 'That you forgot accidentally / with a bit of "oops"',
      feedbackCorrect: 'Exactly. It softens the confession with an accidental "oops" nuance.',
      feedbackWrong: '〜ちゃった (from 〜てしまった) conveys an unintended or regrettable slip.'
    }
  },
  {
    id: 'atama-ga-panku',
    japanese: '頭がパンクしそう',
    kana: 'あたまがパンクしそう',
    romaji: 'Atama ga panku shisō',
    english: 'My brain feels like it’s about to explode',
    arabic: 'أشعر أن رأسي سينفجر من المعلومات',
    difficulty: 'Colloquial',
    category: 'study',
    otomoIntro: 'Peak midterm week vocabulary. Use responsibly.',
    context: 'Humorous everyday expression when your brain is overloaded with information.',
    dialogue: [
      { speaker: 'You', jp: '公式を覚えすぎて頭がパンクしそう。', romaji: 'Kōshiki o oboesugite atama ga panku shisō.', en: 'I memorized so many formulas my head might burst.' },
      { speaker: 'Otomo', jp: 'いったん水を飲んで休憩しよう。', romaji: 'Ittan mizu o nonde kyūkei shiyō.', en: 'Drink some water and take a break first.' }
    ],
    tip: 'パンク (panku) comes from "puncture" (like a flat tire blowing out).',
    challenge: {
      type: 'meaning',
      prompt: 'When a student says 「頭がパンクしそう」, what are they feeling?',
      choices: [
        'Information overload / brain about to burst',
        'Ready to run a marathon',
        'Excited for lunch'
      ],
      answer: 'Information overload / brain about to burst',
      feedbackCorrect: 'Yep — time for a Pomodoro break.',
      feedbackWrong: 'It literally means "my head is about to blow a tire" = brain overload.'
    }
  },
  {
    id: 'kotsukotsu',
    japanese: 'コツコツ頑張る',
    kana: 'コツコツがんばる',
    romaji: 'Kotsukotsu ganbaru',
    english: 'To work steadily and consistently',
    arabic: 'الاجتهاد بثبات واستمرارية',
    difficulty: 'N3',
    category: 'study',
    otomoIntro: 'Less dramatic than a 3 a.m. cram session, infinitely more effective.',
    context: 'Describes quiet, steady, consistent effort over time.',
    dialogue: [
      { speaker: 'Friend', jp: 'どうやってそんなに早く終わったの？', romaji: 'Dō yatte sonna ni hayaku owatta no?', en: 'How did you finish so early?' },
      { speaker: 'You', jp: '毎日コツコツやってたから。', romaji: 'Mainichi kotsukotsu yatteta kara.', en: 'Because I worked on it steadily every day.' }
    ],
    tip: 'コツコツ is an onomatopoeia for steady tapping — like chipping away at a big task bit by bit.',
    challenge: {
      type: 'meaning',
      prompt: 'What does 「コツコツ」 describe?',
      choices: ['Steady, consistent effort', 'Procrastinating until midnight', 'Skipping a lecture'],
      answer: 'Steady, consistent effort',
      feedbackCorrect: 'Yes! Steady progress beats panic.',
      feedbackWrong: 'コツコツ means doing something steadily bit by bit.'
    }
  },
  {
    id: 'choushi-ga-ii',
    japanese: '調子がいい',
    kana: 'ちょうしがいい',
    romaji: 'Chōshi ga ii',
    english: 'To be in good shape / things are going smoothly',
    arabic: 'في حالة جيدة / الأمور تسير بسلاسة',
    difficulty: 'N4',
    category: 'coding',
    otomoIntro: 'Say this when all unit tests pass on the first run. (Rare, I know.)',
    context: 'Used for your own focus/energy, or for how a laptop/program is running.',
    dialogue: [
      { speaker: 'Friend', jp: '今日、集中できてる？', romaji: 'Kyō, shūchū dekiteru?', en: 'Are you able to focus today?' },
      { speaker: 'You', jp: 'うん、今日は調子がいいよ！', romaji: 'Un, kyō wa chōshi ga ii yo!', en: 'Yeah, I am in a great rhythm today!' }
    ],
    tip: 'The opposite is 「調子が悪い」 (chōshi ga warui) — "feeling off" or "acting up" (for a PC/device too).',
    variation: { label: 'Opposite', jp: '調子が悪い', romaji: 'Chōshi ga warui' },
    challenge: {
      type: 'reply',
      prompt: 'Your friend asks how your study session is going and you are flying through problems. You say:',
      situation: 'Feeling productive.',
      choices: [
        { jp: '今日は調子がいいよ！', romaji: 'Kyō wa chōshi ga ii yo!', en: 'Things are going really smoothly today!' },
        { jp: 'お邪魔しました。', romaji: 'Ojama shimashita.', en: 'Sorry for intruding.' },
        { jp: '知りません。', romaji: 'Shirimasen.', en: "I don't know." }
      ],
      answerIndex: 0,
      feedbackCorrect: 'Nice rhythm! 調子 (chōshi) = condition/rhythm.',
      feedbackWrong: '「調子がいい」 means "in good form / going smoothly."'
    }
  },
  {
    id: 'tasukete',
    japanese: 'ちょっと見てもらえますか',
    kana: 'ちょっとみてもらえますか',
    romaji: 'Chotto mite moraemasu ka',
    english: 'Could you take a quick look at this?',
    arabic: 'هل يمكنك إلقاء نظرة سريعة على هذا؟',
    difficulty: 'N4',
    category: 'coding',
    otomoIntro: 'Much smoother than "MY CODE IS BROKEN HELP" in a lab.',
    context: 'Polite way to ask a TA or classmate to check your work or code.',
    dialogue: [
      { speaker: 'You', jp: 'すみません、このエラー、ちょっと見てもらえますか？', romaji: 'Sumimasen, kono erā, chotto mite moraemasu ka?', en: 'Excuse me, could you take a quick look at this error?' },
      { speaker: 'TA', jp: 'いいよ、見せて。', romaji: 'Ii yo, misete.', en: 'Sure, show me.' }
    ],
    tip: '「〜てもらえますか」 is a polite, natural way to ask someone for a favor.',
    challenge: {
      type: 'meaning',
      prompt: 'What are you asking with 「ちょっと見てもらえますか」?',
      choices: [
        'Could you take a quick look at this?',
        'Can I borrow your pen?',
        'When does the exam start?'
      ],
      answer: 'Could you take a quick look at this?',
      feedbackCorrect: 'Correct! Polite and practical.',
      feedbackWrong: '見て (look) + もらえますか (could I have you...) = "could you take a look?"'
    }
  },
  {
    id: 'ganbarou',
    japanese: '一緒に頑張ろう',
    kana: 'いっしょにがんばろう',
    romaji: 'Issho ni ganbarō',
    english: "Let's do our best together",
    arabic: 'لنَبذل قصارى جهدنا معاً',
    difficulty: 'N5',
    category: 'campus',
    otomoIntro: 'Studying alone is fine. Studying with someone who suffers through the same syllabus is better.',
    context: 'Encouraging a friend or study partner before an exam or project.',
    dialogue: [
      { speaker: 'Friend', jp: '明日の試験、ちょっと不安だな。', romaji: 'Ashita no shiken, chotto fuan da na.', en: "I'm a bit nervous about tomorrow's exam." },
      { speaker: 'You', jp: '大丈夫、一緒に頑張ろう！', romaji: 'Daijōbu, issho ni ganbarō!', en: "It's okay, let's do our best together!" }
    ],
    tip: '頑張ろう (ganbarō) is the volitional "let’s do our best," warmer and more collaborative than a command.',
    challenge: {
      type: 'meaning',
      prompt: 'What does 「一緒に頑張ろう」 mean?',
      choices: ["Let's do our best together", 'Good luck on your own', 'See you next semester'],
      answer: "Let's do our best together",
      feedbackCorrect: 'Exactly. 一緒に (issho ni) = together.',
      feedbackWrong: '一緒に means "together," and 頑張ろう is "let’s do our best!"'
    }
  }
]

const STORAGE_KEY = 'otomo:jp-practice-v2'

export interface JapanesePracticeState {
  streak: number
  lastCompleted: string | null
  completedIds: string[]
  recentIds: string[]
  totalCompleted: number
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function readPracticeState(): JapanesePracticeState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      return {
        streak: typeof raw.streak === 'number' ? raw.streak : 0,
        lastCompleted: typeof raw.lastCompleted === 'string' ? raw.lastCompleted : null,
        completedIds: Array.isArray(raw.completedIds) ? raw.completedIds.filter((x: unknown) => typeof x === 'string') : [],
        recentIds: Array.isArray(raw.recentIds) ? raw.recentIds.filter((x: unknown) => typeof x === 'string') : [],
        totalCompleted: typeof raw.totalCompleted === 'number' ? raw.totalCompleted : 0
      }
    }
    // Migrate legacy v1 streak if present
    const legacy = JSON.parse(localStorage.getItem('otomo:japanese-practice') ?? 'null')
    if (legacy && typeof legacy.streak === 'number') {
      return {
        streak: legacy.streak,
        lastCompleted: typeof legacy.lastCompleted === 'string' ? legacy.lastCompleted : null,
        completedIds: [],
        recentIds: [],
        totalCompleted: legacy.streak
      }
    }
  } catch {
    // Ignore corrupt storage
  }
  return { streak: 0, lastCompleted: null, completedIds: [], recentIds: [], totalCompleted: 0 }
}

export function savePracticeState(state: JapanesePracticeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Selects today's phrase deterministically for the current date,
 * avoiding phrases seen in the recent history window when possible.
 */
export function pickDailyPhrase(date = new Date(), state?: JapanesePracticeState): JapanesePhrase {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const recent = new Set((state?.recentIds ?? []).slice(-10))
  const pool = JAPANESE_PHRASES.filter(p => !recent.has(p.id))
  const candidates = pool.length > 0 ? pool : JAPANESE_PHRASES
  return candidates[dayNumber % candidates.length]
}

/**
 * Picks a fresh bonus phrase different from the current phrase and recent ones.
 */
export function pickBonusPhrase(currentId: string, state?: JapanesePracticeState): JapanesePhrase {
  const recent = new Set([...(state?.recentIds ?? []).slice(-8), currentId])
  const uncompleted = JAPANESE_PHRASES.filter(p => !recent.has(p.id) && !(state?.completedIds ?? []).includes(p.id))
  const pool = uncompleted.length > 0
    ? uncompleted
    : JAPANESE_PHRASES.filter(p => p.id !== currentId)
  return pool[Math.floor(Math.random() * pool.length)] ?? JAPANESE_PHRASES[0]
}
