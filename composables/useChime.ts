export function useChime() {
  const muted = useState('chime-muted', () => false)

  function toggleMute() {
    muted.value = !muted.value
    if (import.meta.client) localStorage.setItem('jbms_chime_muted', String(muted.value))
  }

  if (import.meta.client) {
    const stored = localStorage.getItem('jbms_chime_muted')
    if (stored === 'true') muted.value = true
  }

  function play() {
    if (muted.value || !import.meta.client) return
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.5)
    } catch {
      // ignore audio errors
    }
  }

  return { muted, toggleMute, play }
}
