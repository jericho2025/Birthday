// Decorative UI and public-safe reactions only. Personal birthday content stays
// in the existing content, book, gift and finale files.
export const birthdayExperience = {
  journey: {
    name: 'Your birthday journey',
    heartLabel: 'A little love, chapter by chapter',
    of: 'of',
    chapters: 'chapters',
    chapter: 'Chapter',
    mystery: 'A little mystery',
    completed: 'Completed — revisit',
    active: 'Current chapter',
    available: 'Ready to resume',
    locked: 'Still under wraps',
  },
  companion: {
    name: 'Little Love',
    idleLabel: 'Your little heart companion',
    muteAction: 'Quiet Little Love’s reactions',
    unmuteAction: 'Allow Little Love’s reactions',
    dismissAction: 'Dismiss Little Love',
    restoreAction: 'Bring Little Love back',
    quietLabel: 'Quiet company',
    quietStages: ['album', 'cassette', 'letter', 'reveal', 'closing'],
    settings: { reactionMs: 4200, cooldownMs: 3600 },
    reactions: {
      pinWrong: { expression: 'surprised', message: 'Hala, My Love! Try mo ulit. ♡' },
      pinEncourage: { expression: 'encouraging', message: 'Take your time, Sweetheart. Walang rush.' },
      pinCorrect: { expression: 'happy', message: 'Ayan! Very good, My Love! ♡' },
      puzzleComplete: { expression: 'excited', message: 'Ang galing naman ng Love ko! ♡' },
      quizWrong: { expression: 'shy', message: 'Hmm, sure ka na diyan, Love? Try mo ulit. ♡' },
      quizEncourage: { expression: 'encouraging', message: 'You’ve got this, My Love. Take your time.' },
      quizCorrect: { expression: 'happy', message: 'That’s my Love! Ang galing! ♡' },
      quizComplete: { expression: 'excited', message: 'Perfect! One step closer, Love. ✧' },
      nearMiss: { expression: 'encouraging', message: 'Konti na lang, My Love! A little magic awaits. ♡' },
      jackpot: { expression: 'excited', message: 'You won, My Love! A lovely surprise awaits. ♡' },
    },
  },
}
