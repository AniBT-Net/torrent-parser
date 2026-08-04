import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { Torrent } from '@/torrent'
import { base64ToUint8, localStore as local_store, uint8ToBase64 } from '@/utils'

type Torrent_data = {
  filename: string
  buffer_str: string
}

export const useMainStore = defineStore('mainStore', () => {
  const torrent_data_list = ref<Torrent_data[]>([])
  local_store.set_store(torrent_data_list, 'torrent_buffer_list')

  const torrent_list = ref<Torrent[]>(
    torrent_data_list.value.map((d) => new Torrent(base64ToUint8(d.buffer_str), d.filename)),
  )

  // Debounce re-encode + persist: deep edits on large torrents are expensive
  let persistTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    torrent_list,
    (list) => {
      if (persistTimer !== undefined) clearTimeout(persistTimer)
      persistTimer = setTimeout(() => {
        const next: Torrent_data[] = []
        for (const t of list) {
          next.push({
            filename: t.filename,
            buffer_str: uint8ToBase64(t.encode()),
          })
        }
        torrent_data_list.value = next
      }, 300)
    },
    { deep: true },
  )

  return { torrent_list }
})
