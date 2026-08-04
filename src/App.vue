<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import RecursiveComponent from '@/components/RecursiveComponent.vue'
import { useTheme } from '@/composables/useTheme'
import { useMainStore } from '@/stores/mainStore'
import { Torrent, Torrent_format } from '@/torrent'
import { copy_to_clipboard } from '@/utils'

const is_show_about = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const original_repo = 'https://github.com/op200/torrent-parser'
const anibt_repo = 'https://github.com/AniBT-Net/torrent-parser'
const anibt_site = 'https://anibt.net'
const parser_site = 'https://parser.anibt.net'

const { preference, resolved, cyclePreference } = useTheme()

const themeLabel = computed(() => {
  if (preference.value === 'system') return `跟随系统（${resolved.value === 'dark' ? '暗' : '亮'}）`
  return preference.value === 'dark' ? '暗色' : '亮色'
})

const themeIcon = computed(() => {
  if (preference.value === 'system') return '◐'
  return preference.value === 'dark' ? '☾' : '☀'
})

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

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 1800)
}

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
    showToast(`已添加 ${files.length} 个种子`)
  }

  input.click()
}

function save_torrent(torrent: Torrent | undefined) {
  if (torrent === undefined) {
    console.error('current torrent obj is null', torrent_list.value[current_torrent_list_index.value])
    return
  }

  const bytes = torrent.encode()
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
  showToast('已开始下载')
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
  if (await copy_to_clipboard(magnets.join('\n'))) showToast('已复制全部 magnet')
}

async function copy_current_magnet() {
  const t = current_torrent.value
  if (!t) return
  if (await copy_to_clipboard(await t.generate_magnet())) showToast('已复制 magnet')
}

async function copy_hash(value: string) {
  if (!value) return
  if (await copy_to_clipboard(value)) showToast('已复制 hash')
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
  <div class="app-shell">
    <header class="app-header">
      <h1 class="brand-title">
        <span class="brand-muted">AniBT</span>
        <span class="brand-sep" aria-hidden="true">/</span>
        Torrent Parser
      </h1>

      <div class="header-actions">
        <button
          type="button"
          class="btn-ghost btn-compact"
          :title="`主题：${themeLabel}（点击切换）`"
          :aria-label="`切换主题，当前：${themeLabel}`"
          @click="cyclePreference"
        >
          <span aria-hidden="true">{{ themeIcon }}</span>
        </button>
        <button type="button" class="btn-ghost btn-compact" @click="is_show_about = !is_show_about">
          About
        </button>
      </div>
    </header>

    <section v-show="is_show_about" class="panel about-panel" aria-label="About">
      <div class="panel-head">
        <h2>About</h2>
        <button type="button" class="btn-ghost btn-icon" aria-label="关闭" @click="is_show_about = false">
          ×
        </button>
      </div>

      <div class="about-grid">
        <article class="about-card">
          <h3>AniBT</h3>
          <p>
            本站由 <strong>AniBT</strong>（追番、字幕组协作与订阅管理平台）部署与维护，
            仓库托管在 AniBT-Net。
          </p>
          <ul class="link-list">
            <li>
              官网：
              <a :href="anibt_site" target="_blank" rel="noopener noreferrer">{{ anibt_site }}</a>
            </li>
            <li>
              在线工具：
              <a :href="parser_site" target="_blank" rel="noopener noreferrer">{{ parser_site }}</a>
            </li>
            <li>
              本仓库：
              <a :href="anibt_repo" target="_blank" rel="noopener noreferrer">{{ anibt_repo }}</a>
            </li>
          </ul>
        </article>

        <article class="about-card">
          <h3>上游项目</h3>
          <p>原始开源实现来自 op200/torrent-parser。</p>
          <ul class="link-list">
            <li>
              源仓库：
              <a :href="original_repo" target="_blank" rel="noopener noreferrer">{{ original_repo }}</a>
            </li>
          </ul>
        </article>

        <article class="about-card about-card-wide">
          <h3>Why “Remove piece layers”?</h3>
          <p>
            <code>bencode</code> 在解码 <code>piece layers</code> 时存在问题；若不移除该字段，
            导出的 torrent 可能变成非法格式。需要重新保存 BT v2 / Hybrid 种子时，可先使用此功能。
          </p>
        </article>
      </div>
    </section>

    <section class="panel toolbar-panel">
      <div class="toolbar">
        <button type="button" @click="add_torrents">Add torrent</button>
        <button type="button" class="btn-secondary" @click="console.info(torrent_list)">
          Print list
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="!torrent_list.length"
          @click="copy_all_magnets"
        >
          Copy all magnet
        </button>
        <button
          type="button"
          class="btn-danger"
          :disabled="!torrent_list.length"
          @click="delete_current"
        >
          Delete current
        </button>
        <button type="button" class="btn-ghost" :disabled="!torrent_list.length" @click="clear_list">
          Clear list
        </button>
      </div>
    </section>

    <section v-if="!torrent_list.length" class="panel empty-panel">
      <div class="empty-state">
        <h2>还没有种子文件</h2>
        <p>选择一个或多个 <code>.torrent</code> 文件，即可查看 info hash、magnet，并编辑字段。</p>
        <button type="button" @click="add_torrents">选择文件</button>
      </div>
    </section>

    <section v-else class="panel content-panel">
      <div class="tabs" role="tablist" aria-label="已打开的种子">
        <button
          v-for="(torrent, i) in torrent_list"
          :key="i"
          type="button"
          role="tab"
          class="tab"
          :class="{ selected: i === current_torrent_list_index }"
          :aria-selected="i === current_torrent_list_index"
          @click="current_torrent_list_index = i"
        >
          <span class="tab-index">{{ i + 1 }}</span>
          <span class="tab-name">{{ torrent.filename || 'unnamed.torrent' }}</span>
        </button>
      </div>

      <div class="meta-card">
        <div class="meta-row">
          <span class="meta-label">文件名</span>
          <span class="meta-value">{{ current_torrent?.filename }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">格式</span>
          <span class="badge">{{ current_format }}</span>
        </div>
        <div v-show="hash_v1" class="meta-row">
          <span class="meta-label">Info Hash v1</span>
          <button type="button" class="hash-chip mono" :title="hash_v1" @click="copy_hash(hash_v1)">
            {{ hash_v1 }}
          </button>
        </div>
        <div v-show="hash_v2" class="meta-row">
          <span class="meta-label">Info Hash v2</span>
          <button type="button" class="hash-chip mono" :title="hash_v2" @click="copy_hash(hash_v2)">
            {{ hash_v2 }}
          </button>
        </div>
      </div>

      <div class="action-row">
        <button type="button" @click="copy_current_magnet">Copy magnet</button>
        <button type="button" class="btn-secondary" @click="save_torrent(current_torrent)">
          Save torrent
        </button>
        <button
          v-if="false"
          type="button"
          :disabled="current_format !== Torrent_format.hybrid"
          @click="torrent_list.push(fake_hybrid_as_v1(current_torrent))"
        >
          Fake hybrid → v1
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="!has_piece_layers"
          @click="torrent_list.push(remove_piece_layers(current_torrent))"
        >
          Remove piece layers
        </button>
      </div>

      <div class="tree-wrap">
        <div class="tree-head">
          <h3>Torrent 字段</h3>
          <span class="hint">点击可展开嵌套字段，支持直接编辑</span>
        </div>
        <RecursiveComponent
          v-if="torrent_list.length > 0"
          :path="[current_torrent_list_index, 'data']"
        />
      </div>
    </section>

    <footer class="app-footer">
      <span>AniBT · Torrent Parser</span>
      <a :href="anibt_site" target="_blank" rel="noopener noreferrer">anibt.net</a>
    </footer>

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>

<style scoped>
.app-shell {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 0.65rem 0.85rem 1.5rem;
  display: grid;
  gap: 0.75rem;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.25rem;
  padding: 0.15rem 0;
}

.brand-title {
  margin: 0;
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-muted {
  color: var(--mauve);
  font-weight: 700;
}

.brand-sep {
  margin: 0 0.35rem;
  color: var(--text-muted);
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.header-actions :deep(.btn-compact),
.header-actions .btn-compact {
  padding: 0.3rem 0.65rem;
  font-size: 0.88rem;
}

.panel {
  background: color-mix(in srgb, var(--bg-elevated) 88%, var(--bg));
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 0.85rem 1rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.about-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.15rem 1.2rem;
}

.about-card-wide {
  grid-column: 1 / -1;
}

.about-card h3 {
  margin: 0 0 0.55rem;
  font-size: 1rem;
  color: var(--peach);
}

.about-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.65;
}

.about-card code {
  font-family: var(--mono);
  font-size: 0.88em;
  padding: 0.08em 0.4em;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent);
}

.link-list {
  margin: 0.85rem 0 0;
  padding-left: 1.15rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.link-list li + li {
  margin-top: 0.4rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.empty-panel {
  padding: 2rem 1rem;
}

.empty-state {
  text-align: center;
  max-width: 28rem;
  margin: 0 auto;
  display: grid;
  gap: 0.55rem;
  justify-items: center;
}

.empty-state h2 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}

.empty-state p {
  margin: 0 0 0.35rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
}

.empty-state code {
  font-family: var(--mono);
  font-size: 0.9em;
  color: var(--teal);
}

.content-panel {
  display: grid;
  gap: 0.85rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.tab {
  max-width: 100%;
  background: var(--bg);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  box-shadow: none;
  gap: 0.5rem;
}

.tab:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.tab.selected {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: transparent;
  box-shadow: none;
}

.tab-index {
  display: inline-grid;
  place-items: center;
  min-width: 1.3rem;
  height: 1.3rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16rem;
}

.meta-card {
  display: grid;
  gap: 0.45rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
}

.meta-row {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.meta-label {
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
}

.meta-value {
  overflow-wrap: anywhere;
  font-size: 1rem;
}

.badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--teal);
  background: color-mix(in srgb, var(--teal) 16%, transparent);
}

.hash-chip {
  justify-content: flex-start;
  width: 100%;
  max-width: 100%;
  padding: 0.45rem 0.7rem;
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: none;
  font-weight: 500;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hash-chip:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.tree-wrap {
  display: grid;
  gap: 0.85rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--border);
}

.tree-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.tree-head h3 {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.hint {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.15rem 0.1rem 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 1.75rem;
  transform: translateX(-50%);
  z-index: 50;
  padding: 0.65rem 1.15rem;
  border-radius: 999px;
  background: var(--text);
  color: var(--bg);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
  animation: toast-in 0.18s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 0.5rem 0.65rem 1.25rem;
    gap: 0.6rem;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }

  .meta-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .tab-name {
    max-width: 10rem;
  }
}
</style>
