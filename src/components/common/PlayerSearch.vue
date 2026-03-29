<template>
  <div class="relative">
    <div class="flex gap-2">
      <input v-model="query" type="text" placeholder="배그 ID로 검색 (다중 계정 모두 검색됨)"
        class="input-field flex-1" @keyup.enter="search" @input="onInput" />
      <button @click="search" :disabled="!query.trim() || loading" class="btn-outline px-4">
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </button>
    </div>

    <!-- 검색 결과 드롭다운 -->
    <div v-if="results.length" class="absolute top-full left-0 right-0 mt-1 card border border-clan-border z-30 overflow-hidden shadow-card">
      <div v-for="r in results" :key="r.id"
        class="px-4 py-3 hover:bg-clan-surface cursor-pointer border-b border-clan-border/50 last:border-0 flex items-center gap-3"
        @click="selectResult(r)">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-clan-text">{{ r.clan_nickname || r.pubg_name || '닉네임 미설정' }}</div>
          <div class="text-xs text-clan-muted font-mono">
            <!-- 매칭된 배그 ID 강조 표시 -->
            <span v-for="acc in r.pubg_accounts" :key="acc.pubg_name"
              :class="['mr-2', acc.pubg_name.toLowerCase().includes(query.toLowerCase()) ? 'text-clan-gold' : '']">
              {{ acc.pubg_name }}{{ acc.is_primary ? ' ★' : '' }}
            </span>
            <span v-if="!r.pubg_accounts?.length && r.pubg_name">{{ r.pubg_name }}</span>
          </div>
        </div>
        <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(r.status)]">{{ r.status }}</span>
      </div>
      <div class="px-4 py-2 text-xs text-clan-muted text-right">{{ results.length }}명 검색됨</div>
    </div>
    <div v-else-if="searched && !loading" class="absolute top-full left-0 right-0 mt-1 card px-4 py-3 text-sm text-clan-muted z-30">
      검색 결과가 없습니다
    </div>
  </div>

  <!-- 선택된 유저 상세 -->
  <MemberDetailModal v-if="selected" :member="selected" @close="selected = null" />
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import MemberDetailModal from '@/components/common/MemberDetailModal.vue'

const query = ref('')
const results = ref([])
const selected = ref(null)
const loading = ref(false)
const searched = ref(false)
let debounceTimer = null

function onInput() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) { results.value = []; searched.value = false; return }
  debounceTimer = setTimeout(search, 400)
}

async function search() {
  if (!query.value.trim()) return
  loading.value = true; searched.value = false

  // members.pubg_name + member_pubg_accounts.pubg_name 모두 검색
  const q = query.value.trim()
  const [{ data: byMain }, { data: byAccounts }] = await Promise.all([
    supabase.from('members').select('*, member_pubg_accounts(*)')
      .ilike('pubg_name', `%${q}%`).limit(5),
    supabase.from('member_pubg_accounts').select('member_id, pubg_name')
      .ilike('pubg_name', `%${q}%`).limit(10),
  ])

  // 부계정 검색 결과로 member_id 수집
  const extraMemberIds = [...new Set((byAccounts ?? []).map(a => a.member_id))]
  let extraMembers = []
  if (extraMemberIds.length) {
    const { data } = await supabase.from('members')
      .select('*, member_pubg_accounts(*)')
      .in('id', extraMemberIds)
    extraMembers = data ?? []
  }

  // 중복 제거 후 합치기
  const allResults = [...(byMain ?? []), ...extraMembers]
  const seen = new Set()
  results.value = allResults.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    // pubg_accounts 정규화
    m.pubg_accounts = m.member_pubg_accounts ?? []
    return true
  })

  searched.value = true; loading.value = false
}

function selectResult(r) {
  selected.value = r
  results.value = []
  query.value = ''
  searched.value = false
}

const statusClass = (s) =>
  s === '신규' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' :
  s === '텟생' ? 'bg-purple-900/40 text-purple-400 border border-purple-700/30' :
  'bg-green-900/40 text-green-400 border border-green-700/30'
</script>
