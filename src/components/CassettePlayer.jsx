import { useEffect, useReducer, useRef } from 'react'
import { connectCassetteAudio } from './cassetteAudio.js'
import { createCassetteState, formatAudioTime, isCassetteComplete, reduceCassette } from './cassetteState.js'
import './Screens.css'
import './CassettePlayer.css'

export function CassettePlayer({ content, headingRef, onComplete, onBack }) {
  const [player, dispatch] = useReducer(reduceCassette, content, createCassetteState)
  const audioRef = useRef(null)
  const controllerRef = useRef(null)
  const { audioSrc, initialVolume, startMuted } = content
  const playing = player.status === 'playing'
  const pending = ['starting', 'buffering'].includes(player.status)
  const hasSource = Boolean(audioSrc)
  const failed = player.status === 'error'
  const canPlay = hasSource && !failed
  const canSeek = canPlay && player.duration > 0
  const complete = isCassetteComplete(player)

  useEffect(() => {
    const controller = connectCassetteAudio(audioRef.current, { audioSrc, initialVolume, startMuted }, dispatch)
    controllerRef.current = controller
    return () => { controller.dispose(); controllerRef.current = null }
  }, [audioSrc, initialVolume, startMuted])

  return (
    <section className={`screen cassette-screen${playing ? ' is-playing' : ''}`} aria-labelledby="cassette-title">
      <header className="cassette-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="cassette-title" ref={headingRef} tabIndex={-1}>{content.title} <em>{content.titleAccent}</em></h1></header>
      <audio ref={audioRef} preload="metadata" aria-hidden="true" />
      <div className="cassette-layout">
        <div className="cassette-display">
          <div className="cassette-tape" role="img" aria-label={`Pastel cassette: ${content.tapeLabel}`}>
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => <span key={corner} className={`tape-screw screw-${corner}`} aria-hidden="true" />)}
            <div className="tape-label"><div className="tape-label-top"><span>{content.sideLabel}</span><small>{content.formatLabel}</small></div><p className="tape-song-title">{content.songTitle}</p><p className="tape-artist">{content.artist}</p><span className="tape-label-rule" /></div>
            <div className="tape-window" aria-hidden="true"><span className="tape-ribbon" />{['left', 'right'].map((side) => <div key={side} className={`reel-well reel-${side}`}><span className="reel-tape" /><span className="cassette-reel"><i /></span></div>)}<span className="window-lines" /></div>
            <span className="tape-custom-label">{content.tapeLabel}</span>
            <div className="cassette-bottom" aria-hidden="true"><i /><span /><i /></div>
          </div>
          <button className="cassette-inspect" aria-expanded={player.inspectionOpen} aria-controls="cassette-note" onClick={() => dispatch({ type: 'inspect' })}><span aria-hidden="true">{player.inspectionOpen ? '−' : '+'}</span>{player.inspectionOpen ? content.closeInspectionAction : content.inspectAction}</button>
          <div id="cassette-note" className="cassette-note" hidden={!player.inspectionOpen}><span aria-hidden="true">♡</span><h2>{content.inspectionTitle}</h2><p>{content.message}</p></div>
        </div>
        <div className="cassette-player-panel">
          <div className="cassette-status" role="status" aria-live="polite" aria-atomic="true"><span className={`playback-light light-${player.status}`} aria-hidden="true" />{content.statusLabels[player.status]}</div>
          <h2>{hasSource ? content.songTitle : content.placeholderTitle}</h2>
          <p className="cassette-panel-description">{hasSource ? content.artist : content.placeholderMessage}</p>
          <div className="cassette-transport">
            <button className="cassette-play primary-button" disabled={!canPlay} onClick={() => { if (playing || pending) controllerRef.current?.pause(); else controllerRef.current?.play() }}><span aria-hidden="true">{playing || pending ? 'Ⅱ' : '▷'}</span>{playing || pending ? content.pauseAction : content.playAction}</button>
            <button className="cassette-small-control" disabled={!canSeek} onClick={() => controllerRef.current?.restart()}><span aria-hidden="true">↺</span>{content.restartAction}</button>
          </div>
          <div className="cassette-progress"><label className="sr-only" htmlFor="cassette-position">{content.seekLabel}</label><input id="cassette-position" type="range" min="0" max={player.duration || 1} step="0.1" value={Math.min(player.currentTime, player.duration || 0)} disabled={!canSeek} onChange={(event) => controllerRef.current?.seek(Number(event.target.value))} aria-valuetext={`${formatAudioTime(player.currentTime)} of ${formatAudioTime(player.duration || NaN)}`} /><div className="cassette-times" aria-live="off"><span>{hasSource ? formatAudioTime(player.currentTime) : '--:--'}</span><span>{formatAudioTime(player.duration || NaN)}</span></div></div>
          <div className="cassette-volume"><button className="cassette-small-control" disabled={!hasSource} aria-pressed={player.muted} onClick={() => controllerRef.current?.toggleMute()}>{player.muted ? content.unmuteAction : content.muteAction}</button><label htmlFor="cassette-volume">{content.volumeLabel}</label><input id="cassette-volume" type="range" min="0" max="1" step="0.01" value={player.volume} disabled={!hasSource} aria-valuetext={`${Math.round(player.volume * 100)}%`} onChange={(event) => controllerRef.current?.setVolume(Number(event.target.value))} /></div>
          {failed && <button className="text-button cassette-retry" onClick={() => controllerRef.current?.retry()}>{content.retryAction}</button>}
          <p className="cassette-keyboard-hint">{content.keyboardHint}</p>
        </div>
      </div>
      <footer className="cassette-journey-actions"><button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button><p role="status" aria-live="polite">{complete ? content.unlockedMessage : content.lockedMessage}</p><button className="primary-button cassette-continue" disabled={!complete} onClick={() => { if (complete) onComplete(player) }}>{content.continueAction}<span aria-hidden="true">→</span></button></footer>
    </section>
  )
}
