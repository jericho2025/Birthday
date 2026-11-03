// Optional Batch 2 discoveries. Original chapter content remains in its own files.
export const birthdaySurprises = {
  closeAction: 'Close little note',
  scratch: {
    enabled: true, title: 'A little secret, just for you', action: 'Discover a Secret Scratch Card',
    hint: 'Rub the pastel foil, or reveal your surprise with the button below.',
    foil: 'A LITTLE LOVE, UNDER WRAPS', revealAction: 'Reveal Surprise', continueAction: 'Continue to the photo book',
    message: 'Unlimited hugs & kisses for My Love. Redeem anytime. Signed with love.',
    revealed: 'A little love, revealed.',
  },
  book: {
    action: 'Open secret note', title: 'A little note tucked inside',
    notes: {
      'birthday-photo-01': '[Your short romantic note for this page goes here.]',
      'birthday-photo-06': '[Another little note for My Love goes here.]',
      'birthday-photo-12': '[Your final hidden album note goes here.]',
    },
  },
  cassette: {
    enabled: true, flipAction: 'Flip Cassette',
    // null inherits the existing Side A source/title/description without changing it.
    sideA: { audioSrc: null, title: null, description: null },
    sideB: { audioSrc: '', title: 'Secret Recording Not Added Yet', description: '[Your optional voice recording goes here.]' },
    sideALabel: 'SIDE A', sideBLabel: 'SIDE B',
  },
  verification: {
    enabled: true, title: 'A little Love Verification',
    disclaimer: 'Just a fictional, playful moment. No identity check, only birthday magic.',
    steps: ['Checking if this surprise belongs to My Love', 'Checking love level', 'Approved with Love'],
    skipAction: 'Skip / Continue to the machine', stepMs: 500,
  },
  jackpot: { label: 'JACKPOT', suspense: 'One last little sparkle of suspense…' },
  certificate: {
    enabled: true, action: 'Open your little keepsake', title: 'A birthday keepsake',
    message: 'A little birthday gift for My Love. Claimed with Love. Includes unlimited hugs, kisses, and all my love.',
    note: 'A romantic souvenir, separate from your physical gift confirmation.',
  },
  wish: {
    enabled: true, candleLabel: 'Make a wish · extinguish candle', extinguishedLabel: 'Candle extinguished',
    hint: 'Make a wish, then tap each candle. This little moment is optional.',
    message: "Whatever you wished for, My Love, I hope every beautiful thing you're dreaming of comes true.",
  },
}
