import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'torrent-parser_theme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

/** 仅切换 data-theme；颜色来自 @catppuccin/palette CSS（Latte / Mocha） */
export function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  root.style.removeProperty('background-color')
  root.style.removeProperty('color')

  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) {
    // Latte base / Mocha base
    themeMeta.setAttribute('content', resolved === 'dark' ? '#1e1e2e' : '#eff1f5')
  }
}

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export function initTheme() {
  applyTheme(resolveTheme(readStoredPreference()))
}

export function useTheme() {
  const preference: Ref<ThemePreference> = ref(readStoredPreference())
  const resolved: Ref<ResolvedTheme> = ref(resolveTheme(preference.value))

  function setPreference(next: ThemePreference) {
    preference.value = next
  }

  function cyclePreference() {
    const order: ThemePreference[] = ['system', 'light', 'dark']
    const i = order.indexOf(preference.value)
    setPreference(order[(i + 1) % order.length]!)
  }

  watch(
    preference,
    (pref) => {
      resolved.value = resolveTheme(pref)
      applyTheme(resolved.value)
      try {
        localStorage.setItem(STORAGE_KEY, pref)
      } catch {
        /* ignore */
      }
    },
    { immediate: true },
  )

  let mql: MediaQueryList | undefined
  const onSystemChange = () => {
    if (preference.value === 'system') {
      resolved.value = getSystemTheme()
      applyTheme(resolved.value)
    }
  }

  onMounted(() => {
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', onSystemChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onSystemChange)
  })

  return {
    preference,
    resolved,
    setPreference,
    cyclePreference,
  }
}
