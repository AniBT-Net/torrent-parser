<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'

import { useMainStore } from '@/stores/mainStore'

type NestedData = Record<string, any> | any[]

const props = defineProps({
  path: {
    type: Array as PropType<Array<string | number>>,
    required: true,
  },
})

const { torrent_list } = useMainStore()

const expandedKeys = ref(new Set<string>())

const isNested = (val: unknown): val is NestedData => {
  return val !== null && typeof val === 'object'
}

const depthStyle = computed(() => {
  const depth = Math.max(0, props.path.length - 2)
  const alpha = Math.min(0.06 + depth * 0.05, 0.28)
  return {
    backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(alpha * 100)}%, transparent)`,
  }
})

const currentValue = computed({
  get() {
    return props.path.reduce((obj: any, key) => obj[key], torrent_list)
  },
  set(newValue) {
    const path = [...props.path]
    const lastKey = path.pop()
    const parent = path.reduce((obj: any, key) => obj[key], torrent_list)
    if (parent && lastKey !== undefined) {
      parent[lastKey] = newValue
    }
  },
})

const toggleExpand = (key: string) => {
  if (expandedKeys.value.has(key)) expandedKeys.value.delete(key)
  else expandedKeys.value.add(key)
}

const displayKey = (key: string | number) => {
  return typeof key === 'number' ? `[${key}]` : key
}
</script>

<template>
  <div class="content-block" :style="depthStyle">
    <template v-if="isNested(currentValue)">
      <div v-for="(value, key) in currentValue" :key="key" class="content-line">
        <template v-if="!isNested(value)">
          <div class="content-simple">
            <span class="content-key">{{ displayKey(key) }}:</span>

            <textarea
              v-if="key === 'comment'"
              :value="value"
              class="content-input"
              @input="
                (currentValue as Record<string, any>)[key as string] = (
                  $event.target as HTMLInputElement
                ).value
              "
            ></textarea>
            <input
              v-else
              type="text"
              class="content-input"
              :value="value"
              @input="(currentValue as any)[key] = ($event.target as HTMLInputElement).value"
            />
          </div>
        </template>

        <template v-else>
          <div class="nested-header" @click="toggleExpand(String(key))">
            <span class="content-key">{{ displayKey(key) }}:</span>
            <span class="toggle-icon" aria-hidden="true">
              {{ expandedKeys.has(String(key)) ? '▼' : '▶' }}
            </span>
          </div>
          <div v-if="expandedKeys.has(String(key))" class="nested-content">
            <RecursiveComponent :path="[...props.path, key]" />
          </div>
        </template>
      </div>
    </template>

    <div v-else class="content-simple">
      <textarea
        class="content-input"
        :value="currentValue"
        @input="currentValue = ($event.target as HTMLInputElement).value"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
textarea {
  resize: vertical;
  min-height: 4rem;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  scrollbar-width: thin;
}

.content-block {
  padding: 0.45rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.content-line {
  margin-bottom: 0.35rem;
}

.content-line:last-child {
  margin-bottom: 0;
}

.content-simple {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.content-key {
  font-weight: 700;
  min-width: max-content;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.content-input {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 0.92rem;
  color: var(--text);
  background: var(--input-bg);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.content-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.nested-header {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.3rem;
  border-radius: var(--radius-sm);
  user-select: none;
}

.nested-header:hover {
  background: var(--bg-hover);
}

.toggle-icon {
  font-size: 0.75em;
  min-width: 1em;
  color: var(--text-muted);
}

.nested-content {
  margin: 0.25rem 0 0.15rem 0.35rem;
  border-left: 1px dashed var(--tree-line);
  padding-left: 0.55rem;
}
</style>
