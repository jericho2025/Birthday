// Public-safe content only. Keep private media, messages, PINs and gifts out of this file.
export const birthdayContent = {
  brand: 'A little birthday magic',
  dateLabel: 'November 20',
  footer: 'A little wonder. A little magic. All for you.',
  welcome: {
    eyebrow: 'TODAY IS A LITTLE MORE SPECIAL',
    title: 'Happy birthday,',
    recipient: '[Your name]',
    description: 'A little world of surprises, made just for you.\nTake your time. The magic is in the little things.',
    action: 'Open Your Surprise',
    note: 'Your birthday adventure starts here',
  },
  pinPlaceholder: {
    eyebrow: 'CHAPTER 01 · A LITTLE MYSTERY',
    title: 'Every surprise starts',
    titleAccent: 'with a little secret.',
    description: 'Your next chapter will begin with a four-digit PIN challenge.',
    label: 'PIN challenge · Coming in Phase 2',
    note: 'This is a placeholder for the next part of your birthday adventure.',
    backAction: 'Back to the beginning',
  },
  // Planned flow; these chapters are intentionally unimplemented in Phase 1.
  journey: [
    { id: 'welcome', label: 'Welcome' },
    { id: 'pin', label: 'PIN challenge' },
    { id: 'puzzle', label: 'Photo puzzle' },
    { id: 'quiz', label: 'Personal quiz' },
    { id: 'album', label: 'Photo flipbook' },
    { id: 'cassette', label: 'Cassette player' },
    { id: 'letter', label: 'Birthday letter' },
    { id: 'machine', label: 'Gift machine' },
    { id: 'reveal', label: 'Present opening' },
    { id: 'closing', label: 'Celebration' },
  ],
  // Reserve public-safe media paths, captions and quiz content for later phases.
  photos: [],
  audio: null,
  quizQuestions: [],
}
