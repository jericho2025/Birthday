import './CelebrationBackdrop.css'

const balloons = ['lavender far-left', 'pink left', 'cream right', 'lavender far-right']
const confetti = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37 + 7) % 100}%`, top: `${(index * 23 + 5) % 94}%`,
  delay: `${-(index % 7)}s`, rotation: `${index * 31}deg`,
}))

export function CelebrationBackdrop() {
  return (
    <div className="celebration-backdrop" aria-hidden="true">
      <div className="ambient-orb orb-left" /><div className="ambient-orb orb-right" />
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      {balloons.map((balloon) => (
        <div className={`balloon-group ${balloon}`} key={balloon}>
          <div className="balloon" />
          <svg className="balloon-string" viewBox="0 0 80 260" fill="none"><path d="M40 0 C8 65 78 85 43 145 S25 220 44 260" /></svg>
        </div>
      ))}
      {confetti.map((piece, index) => (
        <span key={index} className={`confetti confetti-${index % 4}`} style={{ left: piece.left, top: piece.top, '--delay': piece.delay, '--rotation': piece.rotation }} />
      ))}
      <span className="floating-spark spark-left">✧</span><span className="floating-spark spark-right">✦</span>
    </div>
  )
}
