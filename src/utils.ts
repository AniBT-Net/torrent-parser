import { watch, type Ref } from 'vue'

const CHUNK = 0x8000

/** Uint8Array → base64 without the Buffer polyfill. */
export function uint8ToBase64(bytes: Uint8Array): string {
  const proto = Uint8Array.prototype as Uint8Array & { toBase64?: () => string }
  if (typeof proto.toBase64 === 'function') return proto.toBase64.call(bytes)

  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** base64 → Uint8Array without the Buffer polyfill. */
export function base64ToUint8(b64: string): Uint8Array {
  const fromBase64 = (Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array }).fromBase64
  if (typeof fromBase64 === 'function') return fromBase64(b64)

  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export namespace localStore {
  export function set_store(refVar: Ref<unknown>, name: string, debounceMs = 300) {
    name = 'torrent-parser_' + name
    const jsonStr = localStorage.getItem(name)
    if (jsonStr) {
      try {
        refVar.value = JSON.parse(jsonStr)
      } catch (e) {
        console.error('Failed to restore localStorage', name, e)
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    watch(
      refVar,
      () => {
        if (timer !== undefined) clearTimeout(timer)
        timer = setTimeout(() => {
          localStorage.setItem(name, JSON.stringify(refVar.value))
        }, debounceMs)
      },
      { deep: true },
    )
  }
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的字符串
 * @returns Promise<boolean> 是否成功
 */
export async function copy_to_clipboard(text: string | undefined): Promise<boolean> {
  if (text === undefined) return false

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('复制失败:', err)
    return fallback_copy(text)
  }
}

function fallback_copy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (err) {
    console.error('降级复制失败:', err)
    document.body.removeChild(textarea)
    return false
  }
}
