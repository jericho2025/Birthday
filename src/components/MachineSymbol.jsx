// Code-native illustrations keep the reels consistent without remote assets or emoji fonts.
export function MachineSymbol({ symbol }) {
  return (
    <svg className="machine-symbol" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ '--symbol-color': symbol.color }}>
      {symbol.kind === 'gift' && <><rect x="12" y="28" width="40" height="27" rx="4" fill="var(--symbol-color)" /><rect x="9" y="21" width="46" height="12" rx="3" fill="#edc7d8" stroke="#ca8fae" /><path d="M29 22h7v33h-7z" fill="#fff0ca" /><path d="M32 21C12 24 16 3 27 12l5 9Zm0 0C52 24 48 3 37 12l-5 9Z" fill="#e6c588" stroke="#c5a263" strokeWidth="2" /><path d="M15 35v15" stroke="#f6dce7" strokeWidth="2" /></>}
      {symbol.kind === 'heart' && <path d="M32 54 11 34C-3 17 18 4 32 20 46 4 67 17 53 34L32 54Z" fill="var(--symbol-color)" stroke="#c37e9c" strokeWidth="2" />}
      {symbol.kind === 'cake' && <><rect x="10" y="30" width="44" height="25" rx="5" fill="var(--symbol-color)" /><path d="M10 34c5 10 9-3 14 4s10-6 15-1 11 5 15-3v-6H10Z" fill="#fff3e4" /><path d="M8 55h48M32 28V16" stroke="#c1a26c" strokeWidth="3" strokeLinecap="round" /><path d="M32 6c8 7 6 13 0 13s-8-6 0-13Z" fill="#e5c47e" /><path d="M16 46h32" stroke="#f4dce9" strokeWidth="2" /></>}
      {symbol.kind === 'star' && <path d="m32 7 8 16 18 3-13 13 3 18-16-9-16 9 3-18L6 26l18-3 8-16Z" fill="var(--symbol-color)" stroke="#c5a568" strokeWidth="2" strokeLinejoin="round" />}
      {symbol.kind === 'bow' && <><path d="M29 31C-1 57 0 5 28 24l4 4 4-4C64 5 65 57 35 31" fill="var(--symbol-color)" stroke="#a284b6" strokeWidth="2" /><path d="m27 32-7 23 12-6 12 6-7-23" fill="#d7c1e5" stroke="#ae8fc1" /><rect x="26" y="24" width="12" height="14" rx="5" fill="#e7d7ef" stroke="#ad8cbe" /></>}
      <path d="M14 12h4M16 10v4" stroke="#ddcba2" strokeLinecap="round" />
    </svg>
  )
}
