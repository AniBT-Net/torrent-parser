<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import RecursiveComponent from '@/components/RecursiveComponent.vue'
import { useMainStore } from '@/stores/mainStore'
import { Torrent, Torrent_format } from '@/torrent'
import { copy_to_clipboard } from '@/utils'

const is_show_about = ref(false)
const home_link = 'https://github.com/op200/torrent-parser'

const mainStore = useMainStore()
const { torrent_list } = storeToRefs(mainStore)

const current_torrent_list_index = ref(0)

const current_torrent = computed(() => torrent_list.value[current_torrent_list_index.value])

const hash_v1 = ref('')
const hash_v2 = ref('')
const current_format = computed(() => current_torrent.value?.get_format() ?? null)
const has_piece_layers = computed(() => {
  const data = current_torrent.value?.data
  return !!data && typeof data === 'object' && 'piece layers' in data
})

// Recompute hashes only when the selected torrent identity/data changes
let hashGen = 0
watch(
  current_torrent,
  async (torrent) => {
    const gen = ++hashGen
    if (!torrent) {
      hash_v1.value = ''
      hash_v2.value = ''
      return
    }
    const [v1, v2] = await Promise.all([torrent.get_hash_v1(), torrent.get_hash_v2()])
    if (gen !== hashGen) return
    hash_v1.value = v1
    hash_v2.value = v2
  },
  { immediate: true, deep: true },
)

async function add_torrents() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.torrent'
  input.multiple = true

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (files === null || files.length === 0) {
      console.error('input torrent -> ', files)
      return
    }

    for (const file of Array.from(files)) {
      torrent_list.value.push(new Torrent(await file.arrayBuffer(), file.name))
    }

    current_torrent_list_index.value = torrent_list.value.length - 1
  }

  input.click()
}

function save_torrent(torrent: Torrent | undefined) {
  if (torrent === undefined) {
    console.error('current torrent obj is null', torrent_list.value[current_torrent_list_index.value])
    return
  }

  const bytes = torrent.encode()
  // Copy into a plain ArrayBuffer so BlobPart typing is happy under strict DOM types
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const blob = new Blob([copy], { type: 'application/x-bittorrent' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = torrent.filename || 'download.torrent'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function fake_hybrid_as_v1(torrent: Torrent | undefined): Torrent {
  if (torrent === undefined) throw new Error('The input file is undefined')

  const v1_torrent = new Torrent(torrent.encode(), `fake_as_v1-${torrent.filename}`)
  delete (v1_torrent.data as any)['piece layers']
  delete v1_torrent.data.info['meta version']
  delete v1_torrent.data.info['file tree']
  return v1_torrent
}

function remove_piece_layers(torrent: Torrent | undefined): Torrent {
  if (torrent === undefined) throw new Error('The input file is undefined')

  const new_torrent = new Torrent(torrent.encode(), `remove_piece_layers-${torrent.filename}`)
  delete (new_torrent.data as any)['piece layers']
  return new_torrent
}

async function copy_all_magnets() {
  const magnets = await Promise.all(torrent_list.value.map((t) => t.generate_magnet()))
  await copy_to_clipboard(magnets.join('\n'))
}

async function copy_current_magnet() {
  const t = current_torrent.value
  if (!t) return
  await copy_to_clipboard(await t.generate_magnet())
}

function clear_list() {
  torrent_list.value.length = 0
  current_torrent_list_index.value = 0
}

function delete_current() {
  torrent_list.value.splice(current_torrent_list_index.value, 1)
  current_torrent_list_index.value = Math.max(0, current_torrent_list_index.value - 1)
}
</script>

<template>
  <div style="display: grid; gap: 1rem">
    <!-- 按钮栏 -->
    <div class="flex-line">
      <button @click="add_torrents">Add torrent</button>
      <button @click="console.info(torrent_list)">Print list</button>
      <button @click="clear_list">Clear list</button>
      <button @click="delete_current" :disabled="!torrent_list.length">Delete current</button>
      <button @click="copy_all_magnets" :disabled="!torrent_list.length">Copy all magnet</button>
      <button @click="is_show_about = !is_show_about">About</button>
    </div>

    <!-- About -->
    <div v-show="is_show_about">
      <h2>About</h2>
      <a :href="home_link" target="_blank" rel="noopener noreferrer">{{ home_link }}</a>
      <p>
        Why need the 'Remove piece layers': The 'bencode' has a bug in decoding piece layers, if the
        'piece layers' are not removed, the output torrent file format is illegal
      </p>
    </div>

    <!-- 内容展示 -->
    <div
      style="border: 1px solid lightgray; padding: 1rem; display: grid; gap: 1rem"
      v-show="torrent_list.length > 0"
    >
      <!-- 页标 -->
      <div class="flex-line">
        <button
          v-for="(torrent, i) in torrent_list"
          :key="i"
          @click="current_torrent_list_index = i"
          :class="i === current_torrent_list_index ? 'selected' : ''"
        >
          {{ i + 1 }}. {{ torrent.filename }}
        </button>
      </div>

      <!-- 解析信息 -->
      <div style="display: grid; gap: 0.5rem">
        <div>{{ current_torrent?.filename }}</div>
        <div>{{ current_format }}</div>
        <div v-show="hash_v1">Info Hash v1: {{ hash_v1 }}</div>
        <div v-show="hash_v2">Info Hash v2: {{ hash_v2 }}</div>
      </div>

      <!-- buttons -->
      <div style="display: flex; gap: 1rem; flex-wrap: wrap">
        <button @click="copy_current_magnet">Copy magnet</button>
        <button @click="save_torrent(current_torrent)">Save torrent</button>
        <button
          v-if="false"
          :disabled="current_format !== Torrent_format.hybrid"
          @click="torrent_list.push(fake_hybrid_as_v1(current_torrent))"
        >
          Fake hybrid → v1
        </button>
        <button
          :disabled="!has_piece_layers"
          @click="torrent_list.push(remove_piece_layers(current_torrent))"
        >
          Remove piece layers
        </button>
      </div>

      <!-- 内容 -->
      <div class="content-box">
        <RecursiveComponent
          v-if="torrent_list.length > 0"
          :path="[current_torrent_list_index, 'data']"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.flex-line {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.content-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.content-key {
  border: 1px solid cornflowerblue;
}

.content-val {
  border: 1px solid rosybrown;
}
</style>
