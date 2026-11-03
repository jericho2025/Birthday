import { useId } from 'react'

// A code-native illustration: no generated or remote birthday/product photography.
export function BirthdayCake({ label, extinguished = [false, false, false] }) {
  const id = useId()
  return <svg className="finale-cake-illustration" viewBox="0 0 400 320" role="img" aria-label={label}>
    <defs>
      <linearGradient id={`${id}-frosting`} x1="0" x2="1"><stop stopColor="#e0bcce" /><stop offset=".32" stopColor="#ffe9ef" /><stop offset=".74" stopColor="#f3cfdc" /><stop offset="1" stopColor="#cda0bd" /></linearGradient>
      <linearGradient id={`${id}-cream`} x1="0" x2="0.8" y2="1"><stop stopColor="#fffef3" /><stop offset="1" stopColor="#f0dfce" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" x2="1"><stop stopColor="#b49a71" /><stop offset=".45" stopColor="#f5e5c1" /><stop offset="1" stopColor="#c3a775" /></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#ffe7ad" stopOpacity=".85" /><stop offset="1" stopColor="#ffe7ad" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="202" cy="282" rx="157" ry="17" fill="#a580a2" opacity=".12" />
    <path d="M185 247h34l-5 37h-24z" fill={`url(#${id}-gold)`} />
    <ellipse cx="202" cy="285" rx="58" ry="7" fill={`url(#${id}-gold)`} />
    <ellipse cx="200" cy="247" rx="143" ry="20" fill="#c6a87d" />
    <ellipse cx="200" cy="242" rx="143" ry="20" fill={`url(#${id}-cream)`} stroke="#e3cfb3" />
    <path d="M82 177v54c0 24 236 24 236 0v-54" fill={`url(#${id}-frosting)`} stroke="#d9afc5" />
    <ellipse cx="200" cy="177" rx="118" ry="24" fill={`url(#${id}-cream)`} stroke="#ead5ce" />
    <path d="M82 178c0 11 14 18 22 16 11-2 5 23 17 23s9-20 21-17 8 14 19 14 9-11 20-10 12 17 23 17 8-16 20-17 12 9 22 8 5-16 19-17 9 13 19 11 9-16 18-18 14-6 16-10" fill={`url(#${id}-cream)`} stroke="#ecd7cd" />
    <path d="M120 114v57c0 21 160 21 160 0v-57" fill={`url(#${id}-cream)`} stroke="#e7cfc7" />
    <ellipse cx="200" cy="114" rx="80" ry="19" fill="#fff6ec" stroke="#e8d6cc" />
    <path d="M120 115c6 15 17 12 25 15s6 17 16 17 7-16 18-13 8 13 18 13 10-12 21-12 9 15 19 13 5-18 18-19 20-6 25-14" fill="#f7dfe8" stroke="#e6c7d7" />
    <path d="M128 162c37 14 107 14 144 0" fill="none" stroke="#d9bf92" strokeWidth="2" />
    <g className="finale-candles">
      {[160, 200, 240].map((x, i) => <g key={x} style={{ '--candle-index': i }}>
        <rect x={x - 4} y={i === 1 ? 56 : 65} width="8" height={i === 1 ? 54 : 43} rx="3" fill={i === 1 ? '#d8c0e3' : '#ecc2d4'} stroke="#c7a6b9" />
        <path d={`M${x - 3} 88l6-5m-6 18 6-5`} stroke="#fffc" strokeWidth="2" />
        <path d={`M${x} ${i === 1 ? 56 : 65}v-5`} stroke="#a48c6b" />
        <g className={`finale-flame${extinguished[i] ? ' is-out' : ''}`}><ellipse cx={x} cy={i === 1 ? 43 : 52} rx="22" ry="27" fill={`url(#${id}-glow)`} /><path d={`M${x} ${i === 1 ? 30 : 39}c-12 15-8 24 0 24s12-9 0-24`} fill="#e9c27f" /><ellipse cx={x} cy={i === 1 ? 48 : 57} rx="3" ry="6" fill="#fff6cd" /></g>
        {extinguished[i] && <path className="candle-smoke" d={`M${x} ${i === 1 ? 48 : 57}c-14-13 13-18 0-34`} fill="none" stroke="#b7a8be" strokeWidth="2" />}
      </g>)}
    </g>
    <g fill="#e4b7cd" stroke="#c99db8">
      <path d="M199 214c-37-40-45 16-5 6l-16 23 16-4 6-17 8 17 15 4-16-23c41 10 32-46-8-6Z" />
      <rect x="194" y="209" width="13" height="17" rx="5" fill="#f5dbe5" />
    </g>
    {[105, 140, 260, 295].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 233 : 228} r="2.5" fill="#cdb080" />)}
    <path d="M53 117v14m-7-7h14m285 41v10m-5-5h10" stroke="#ccb386" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
}
