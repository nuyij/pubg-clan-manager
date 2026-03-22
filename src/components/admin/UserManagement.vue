<template>
  <div class="card p-6 space-y-6">
    <div class="section-title">👥 유저 및 승급 관리</div>

    <!-- 수동 추가 폼 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="text-xs text-clan-muted font-mono tracking-wider">신규 유저 수동 등록 (텟생/비로그인 유저용)</div>
      <div class="flex gap-2 flex-wrap">
        <input v-model="newUser.pubg_name" type="text" placeholder="배그 인게임 ID" class="input-field flex-1 min-w-36" @keyup.enter="addUser" />
        <input v-model="newUser.clan_nickname" type="text" placeholder="클랜 닉네임" class="input-field flex-1 min-w-36" />
        <select v-model="newUser.status" class="input-field w-28">
          <option value="신규">신규</option>
          <option value="텟생">텟생</option>
          <option value="클랜원">클랜원</option>
        </select>
        <button @click="addUser" :disabled="!newUser.pubg_name || adding" class="btn-gold whitespace-nowrap">
          {{ adding ? '추가 중...' : '+ 추가' }}
        </button>
      </div>
      <div v-if="addError" class="text-red-400 text-xs font-mono">⚠️ {{ addError }}</div>
    </div>

    <!-- 검색 & 필터 -->
    <div class="flex gap-3 flex-wrap">
      <input v-model="search" type="text" placeholder="닉네임 / 배그 ID 검색..." class="input-field flex-1 min-w-40" />
      <select v-model="filterStatus" class="input-field w-32">
        <option value="">전체</option>
        <option value="신규">신규</option>
        <option value="텟생">텟생</option>
        <option value="클랜원">클랜원</option>
      </select>
    </div>

    <!-- 목록 -->
    <div class="card overflow-hidden">
      <div class="border-b border-clan-border px-4 py-2 flex items-center justify-between">
        <span class="text-xs font-mono text-clan-muted">{{ filteredMembers.length }}명</span>
        <span class="text-xs text-yellow-500 font-mono">⚠️ 승급 대상 {{ upgradeCount }}명</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[600px]">
          <thead>
            <tr class="border-b border-clan-border">
              <th class="px-4 py-3 text-left text-xs text-clan-muted font-display tracking-widest">클랜 닉네임</th>
              <th class="px-4 py-3 text-left text-xs text-clan-muted font-display tracking-widest">배그 ID</th>
              <th class="px-4 py-3 text-center text-xs text-clan-muted font-display tracking-widest">상태</th>
              <th class="px-4 py-3 text-center text-xs text-clan-muted font-display tracking-widest">권한</th>
              <th class="px-4 py-3 text-left text-xs text-clan-muted font-display tracking-widest">등록일</th>
              <th class="px-4 py-3 text-right text-xs text-clan-muted font-display tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filteredMembers" :key="m.id"
              :class="['border-b border-clan-border/50 transition-colors', rankingStore.isUpgradeReady(m) ? 'bg-yellow-900/10' : 'hover:bg-clan-surface/40']">
              <td class="px-4 py-3">
                <span class="text-sm text-clan-text font-body">{{ m.clan_nickname || '—' }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs text-clan-muted font-mono">{{ m.pubg_name || '미설정' }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(m.status)]">{{ m.status }}</span>
                  <span v-if="rankingStore.isUpgradeReady(m)" class="upgrade-badge text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/50 text-yellow-400 font-mono">⚠️ 승급 대상</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['text-[10px] px-1.5 py-0.5 rounded font-mono', roleClass(m.role)]">{{ roleLabel(m.role) }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-clan-muted">{{ formatDate(m.joined_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-1.5 justify-end flex-wrap">
                  <!-- 승급 버튼 -->
                  <button v-if="rankingStore.isUpgradeReady(m)" @click="updateStatus(m, '클랜원')"
                    class="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-black rounded font-bold transition-colors">승급</button>
                  <!-- 상태 변경 -->
                  <select v-else :value="m.status" @change="updateStatus(m, $event.target.value)"
                    class="text-xs bg-clan-surface border border-clan-border rounded px-1.5 py-1 text-clan-muted focus:border-clan-gold focus:outline-none">
                    <option value="신규">신규</option>
                    <option value="텟생">텟생</option>
                    <option value="클랜원">클랜원</option>
                  </select>
                  <!-- 관리자 권한 (마스터만) -->
                  <button v-if="authStore.isMaster && m.role !== 'master'"
                    @click="toggleAdmin(m)"
                    :title="m.role === 'admin' ? '관리자 해제' : '관리자 지정'"
                    :class="['text-xs px-2 py-1 rounded border transition-colors',
                      m.role === 'admin' ? 'border-blue-500/50 text-blue-400 hover:bg-blue-900/30' : 'border-clan-border text-clan-muted hover:border-blue-500 hover:text-blue-400']">
                    ⚙️
                  </button>
                  <!-- 추방 -->
                  <button @click="deleteTarget = m"
                    class="text-xs px-2 py-1 border border-red-700/40 text-red-400 hover:bg-red-900/30 rounded transition-colors">추방</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!filteredMembers.length" class="text-center py-8 text-clan-muted text-sm">등록된 유저가 없습니다</div>
    </div>

    <!-- 추방 확인 모달 -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-sm w-full animate-slide-up space-y-4">
          <div class="text-center">
            <div class="text-4xl mb-3">⚠️</div>
            <h3 class="font-display font-bold text-lg text-red-400">추방 확인</h3>
            <p class="text-sm text-clan-text-dim mt-2">
              <span class="text-clan-text font-bold">{{ deleteTarget.clan_nickname || deleteTarget.pubg_name }}</span>을(를) 추방합니다.<br>
              전적 데이터도 함께 삭제됩니다.
            </p>
          </div>
          <div class="flex gap-3">
            <button @click="deleteTarget = null" class="flex-1 btn-outline">취소</button>
            <button @click="confirmDelete" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors">추방</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const rankingStore = useRankingStore()
const authStore = useAuthStore()
const search = ref('')
const filterStatus = ref('')
const adding = ref(false)
const addError = ref('')
const deleteTarget = ref(null)
const newUser = ref({ pubg_name: '', clan_nickname: '', status: '신규' })

const filteredMembers = computed(() =>
  rankingStore.members.filter(m => {
    const q = search.value.toLowerCase()
    const matchSearch = !q || (m.clan_nickname ?? '').toLowerCase().includes(q) || (m.pubg_name ?? '').toLowerCase().includes(q)
    return matchSearch && (!filterStatus.value || m.status === filterStatus.value)
  })
)
const upgradeCount = computed(() => rankingStore.members.filter(m => rankingStore.isUpgradeReady(m)).length)

onMounted(() => rankingStore.fetchMembers())

async function addUser() {
  if (!newUser.value.pubg_name.trim()) return
  adding.value = true; addError.value = ''
  try {
    const { error } = await supabase.from('members').insert({
      pubg_name: newUser.value.pubg_name.trim(),
      clan_nickname: newUser.value.clan_nickname.trim() || null,
      status: newUser.value.status, role: 'user',
    })
    if (error) throw error
    newUser.value = { pubg_name: '', clan_nickname: '', status: '신규' }
    await rankingStore.fetchMembers()
  } catch (e) {
    addError.value = e.message.includes('unique') ? '이미 등록된 닉네임 또는 배그 ID입니다' : e.message
  } finally { adding.value = false }
}

async function updateStatus(m, status) {
  await supabase.from('members').update({ status }).eq('id', m.id)
  await rankingStore.fetchMembers()
}

async function toggleAdmin(m) {
  if (!authStore.isMaster) return
  const newRole = m.role === 'admin' ? 'user' : 'admin'
  await supabase.from('members').update({ role: newRole }).eq('id', m.id)
  await rankingStore.fetchMembers()
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  await supabase.from('members').delete().eq('id', deleteTarget.value.id)
  deleteTarget.value = null
  await rankingStore.fetchMembers()
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ko-KR') : '-'
const statusClass = (s) => s === '신규' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' : s === '텟생' ? 'bg-purple-900/40 text-purple-400 border border-purple-700/30' : 'bg-green-900/40 text-green-400 border border-green-700/30'
const roleClass = (r) => r === 'master' ? 'bg-yellow-600/30 text-yellow-400' : r === 'admin' ? 'bg-blue-900/30 text-blue-400' : 'bg-clan-surface text-clan-muted'
const roleLabel = (r) => r === 'master' ? '👑 마스터' : r === 'admin' ? '⚙️ 관리자' : '일반'
</script>
