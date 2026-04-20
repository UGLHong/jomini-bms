type DarkModePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'jbms_dark_mode'

function applyDocumentClass(dark: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', dark)
}

function computeEffective(pref: DarkModePreference): boolean {
  if (pref === 'dark') return true
  if (pref === 'light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDarkMode() {
  const pref = useState<DarkModePreference>('dark-mode-pref', () => 'system')
  const effective = useState<boolean>('dark-mode-effective', () => false)

  function setPreference(next: DarkModePreference) {
    pref.value = next
    effective.value = computeEffective(next)
    applyDocumentClass(effective.value)
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, next)
  }

  function toggle() {
    setPreference(effective.value ? 'light' : 'dark')
  }

  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY) as DarkModePreference | null
    const initial: DarkModePreference = stored ?? 'system'
    pref.value = initial
    effective.value = computeEffective(initial)
    applyDocumentClass(effective.value)
  }

  return { pref: readonly(pref), effective: readonly(effective), setPreference, toggle }
}
