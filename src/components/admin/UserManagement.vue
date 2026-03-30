<template>
  <div class="card p-6 space-y-6">
    <div class="section-title">👥 유저 및 승급 관리</div>

    <!-- 승인 대기 목록 -->
    <div v-if="pendingMembers.length" class="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-sm font-mono text-blue-400 font-bold">📬 가입 승인 대기 ({{ pendingMembers.length }}명)</div>
      </div>
      <div v-for="m in pendingMembers" :key="m.id"
        class="flex items-center gap-3 bg-clan-card rounded p-3 border border-clan-border">
        <div class="flex-1 min-w-0">
          <div class="text-sm text-clan-text font-bold">{{ m.discord_name || '이름 없음' }}</div>
          <div class="text-xs text-clan-muted font-mono">Discord ID: {{ m.discord_id }}</div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button @click="approveMember(m)" class="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded font-bold transition-colors">
            ✅ 승인
          </button>
          <button @click="rejectMember(m)" class="text-xs px-3 py-1.5 border border-red-700/40 text-red-400 hover:bg-red-900/30 rounded transition-colors">
            ❌ 거절
          </button>
        </div>
      </div>
    </div>

    <!-- 수동 추가 폼 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="text-xs text-clan-muted font-mono tracking-wider">신규 유저 수동 등록 (텟생/비로그인 유저용)</div>
      <div class="flex gap-2 flex-wrap">
        <input v-model="newUser.pubg_name" type="text" placeholder="배그 인게임 ID" class="input-field flex-1 min-w-36" @keyup.enter="addUser" />
        <input v-model="newUser.clan_nickname" type="text" placeholder="클랜 닉네임" class="input-field flex-1 min-w-36" />
        <select v-model="newUser.status" class="input-field w-28">
          <option value="텟생">텟생</option>
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
        <table class="w-full min-w-[640px]">
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
                <!-- 배그 ID + 관리자 수정 버튼 -->
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-clan-muted font-mono">{{ m.pubg_name || '미설정' }}</span>
                  <button @click="openPubgEdit(m)"
                    class="text-[10px] px-1.5 py-0.5 border border-clan-border rounded text-clan-muted hover:border-clan-gold hover:text-clan-gold transition-colors"
                    title="배그 ID 수정">
                    ✏️
                  </button>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(m.status)]">{{ m.status }}</span>
                  <span v-if="rankingStore.isUpgradeReady(m)"
                    class="upgrade-badge text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/50 text-yellow-400 font-mono">
                    ⚠️ 승급 대상
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['text-[10px] px-1.5 py-0.5 rounded font-mono', roleClass(m.role)]">{{ roleLabel(m.role) }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-clan-muted">{{ formatDate(m.joined_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-1.5 justify-end flex-wrap">
                  <button v-if="rankingStore.isUpgradeReady(m)" @click="updateStatus(m, '클랜원')"
                    class="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-black rounded font-bold transition-colors">승급</button>
                  <select v-else :value="m.status" @change="updateStatus(m, $event.target.value)"
                    class="text-xs bg-clan-surface border border-clan-border rounded px-1.5 py-1 text-clan-muted focus:border-clan-gold focus:outline-none">
                    <option value="신규">신규</option>
                    <option value="텟생">텟생</option>
                    <option value="클랜원">클랜원</option>
                  </select>
                  <button v-if="authStore.isMaster && m.role !== 'master'" @click="toggleAdmin(m)"
                    :title="m.role === 'admin' ? '관리자 해제' : '관리자 지정'"
                    :class="['text-xs px-2 py-1 rounded border transition-colors',
                      m.role === 'admin' ? 'border-blue-500/50 text-blue-400 hover:bg-blue-900/30'
                                        : 'border-clan-border text-clan-muted hover:border-blue-500 hover:text-blue-400']">
                    ⚙️
                  </button>
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

    <!-- 배그 ID 수정 모달 -->
      <div v-if="pubgEditTarget" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-md w-full animate-slide-up space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg text-clan-gold">배그 ID 관리</h3>
            <button @click="pubgEditTarget = null" class="text-clan-muted hover:text-clan-text">✕</button>
          </div>
          <div class="text-sm text-clan-text-dim">
            <span class="text-clan-text font-bold">{{ pubgEditTarget.clan_nickname || pubgEditTarget.pubg_name }}</span>
            의 배그 ID를 관리합니다
          </div>

          <!-- 등록된 계정 목록 -->
          <div class="space-y-2">
            <div class="text-xs text-clan-muted font-mono">등록된 배그 ID ({{ pubgAccounts.length }}/5)</div>
            <div v-for="acc in pubgAccounts" :key="acc.id"
              class="flex items-center gap-2 bg-clan-surface rounded p-2 border border-clan-border">
              <span class="flex-1 font-mono text-sm text-clan-text truncate">{{ acc.pubg_name }}</span>
              <span v-if="acc.is_primary" class="text-[10px] text-clan-gold font-mono">★ 기본</span>
              <button v-if="!acc.is_primary" @click="setPrimaryAccount(acc)"
                class="text-[10px] px-2 py-0.5 border border-clan-border rounded text-clan-muted hover:border-clan-gold hover:text-clan-gold transition-colors whitespace-nowrap">
                기본으로
              </button>
              <button @click="removeAccount(acc)"
                class="text-[10px] px-2 py-0.5 border border-red-700/40 text-red-400 hover:bg-red-900/30 rounded transition-colors">
                삭제
              </button>
            </div>
            <div v-if="!pubgAccounts.length" class="text-xs text-clan-muted text-center py-2 bg-clan-surface rounded border border-clan-border">
              등록된 배그 계정이 없습니다
            </div>
          </div>

          <!-- 추가 -->
          <div v-if="pubgAccounts.length < 5" class="flex gap-2">
            <input v-model="newPubgName" type="text" placeholder="추가할 배그 인게임 닉네임"
              class="input-field flex-1" @keyup.enter="addPubgAccount" />
            <button @click="addPubgAccount" :disabled="!newPubgName.trim() || pubgEditSaving"
              class="btn-gold px-4 whitespace-nowrap">추가</button>
          </div>
          <div v-if="pubgEditError" class="text-red-400 text-xs font-mono">⚠️ {{ pubgEditError }}</div>
          <div v-if="pubgEditMsg" class="text-green-400 text-xs font-mono">✅ {{ pubgEditMsg }}</div>
        </div>
      </div>

    <!-- 추방 확인 모달 -->
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

// 배그 ID 수정
const pubgEditTarget = ref(null)
const pubgAccounts = ref([])
const newPubgName = ref('')
const pubgEditSaving = ref(false)
const pubgEditError = ref('')
const pubgEditMsg = ref('')

const pendingMembers = computed(() =>
  rankingStore.members.filter(m => m.is_pending)
)

const filteredMembers = computed(() =>
  rankingStore.members.filter(m => {
    if (m.is_pending) return false  // 승인 대기는 위 섹션에서 별도 표시
    const q = search.value.toLowerCase()
    const matchSearch = !q || (m.clan_nickname ?? '').toLowerCase().includes(q) || (m.pubg_name ?? '').toLowerCase().includes(q)
    return matchSearch && (!filterStatus.value || m.status === filterStatus.value)
  })
)
const upgradeCount = computed(() => rankingStore.members.filter(m => rankingStore.isUpgradeReady(m)).length)

onMounted(() => rankingStore.fetchMembers())

async function approveMember(m) {
  await supabase.from('members').update({ is_pending: false, status: '신규' }).eq('id', m.id)
  await rankingStore.fetchMembers()
}

async function rejectMember(m) {
  if (!confirm(`${m.discord_name || m.discord_id}의 가입 신청을 거절하고 삭제할까요?`)) return
  await supabase.from('members').delete().eq('id', m.id)
  await rankingStore.fetchMembers()
}

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
  await supabase.from('members').update({ role: m.role === 'admin' ? 'user' : 'admin' }).eq('id', m.id)
  await rankingStore.fetchMembers()
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  await supabase.from('members').delete().eq('id', deleteTarget.value.id)
  deleteTarget.value = null
  await rankingStore.fetchMembers()
}

// 배그 ID 수정 모달
async function openPubgEdit(member) {
  pubgEditTarget.value = member
  pubgEditError.value = ''
  pubgEditMsg.value = ''
  newPubgName.value = ''
  await loadPubgAccounts(member.id)
}

async function loadPubgAccounts(memberId) {
  const { data } = await supabase.from('member_pubg_accounts')
    .select('*').eq('member_id', memberId)
    .order('is_primary', { ascending: false })
  pubgAccounts.value = data ?? []
}

async function addPubgAccount() {
  if (!newPubgName.value.trim() || !pubgEditTarget.value) return
  if (pubgAccounts.value.length >= 5) { pubgEditError.value = '최대 5개까지 등록 가능합니다'; return }
  pubgEditSaving.value = true; pubgEditError.value = ''
  try {
    const isPrimary = pubgAccounts.value.length === 0
    const { error } = await supabase.from('member_pubg_accounts').insert({
      member_id: pubgEditTarget.value.id,
      pubg_name: newPubgName.value.trim(),
      is_primary: isPrimary,
    })
    if (error) throw new Error(error.message.includes('unique') ? '이미 등록된 배그 ID입니다' : error.message)
    if (isPrimary) {
      await supabase.from('members').update({ pubg_name: newPubgName.value.trim() }).eq('id', pubgEditTarget.value.id)
      await rankingStore.fetchMembers()
    }
    newPubgName.value = ''
    pubgEditMsg.value = '추가되었습니다'
    setTimeout(() => pubgEditMsg.value = '', 2000)
    await loadPubgAccounts(pubgEditTarget.value.id)
  } catch (e) { pubgEditError.value = e.message }
  finally { pubgEditSaving.value = false }
}

async function setPrimaryAccount(acc) {
  if (!pubgEditTarget.value) return
  await supabase.from('member_pubg_accounts').update({ is_primary: false }).eq('member_id', pubgEditTarget.value.id)
  await supabase.from('member_pubg_accounts').update({ is_primary: true }).eq('id', acc.id)
  await supabase.from('members').update({ pubg_name: acc.pubg_name }).eq('id', pubgEditTarget.value.id)
  await rankingStore.fetchMembers()
  await loadPubgAccounts(pubgEditTarget.value.id)
  pubgEditMsg.value = `${acc.pubg_name}을 기본 계정으로 설정했습니다`
  setTimeout(() => pubgEditMsg.value = '', 2000)
}

async function removeAccount(acc) {
  if (!confirm(`${acc.pubg_name}을 삭제할까요?`)) return
  await supabase.from('member_pubg_accounts').delete().eq('id', acc.id)
  if (acc.is_primary) {
    const remaining = pubgAccounts.value.filter(a => a.id !== acc.id)
    if (remaining.length) {
      await supabase.from('member_pubg_accounts').update({ is_primary: true }).eq('id', remaining[0].id)
      await supabase.from('members').update({ pubg_name: remaining[0].pubg_name }).eq('id', pubgEditTarget.value.id)
    } else {
      await supabase.from('members').update({ pubg_name: null }).eq('id', pubgEditTarget.value.id)
    }
    await rankingStore.fetchMembers()
  }
  await loadPubgAccounts(pubgEditTarget.value.id)
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ko-KR') : '-'
const statusClass = (s) => s === '신규' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' : s === '텟생' ? 'bg-purple-900/40 text-purple-400 border border-purple-700/30' : 'bg-green-900/40 text-green-400 border border-green-700/30'
const roleClass = (r) => r === 'master' ? 'bg-yellow-600/30 text-yellow-400' : r === 'admin' ? 'bg-blue-900/30 text-blue-400' : 'bg-clan-surface text-clan-muted'
const roleLabel = (r) => r === 'master' ? '👑 마스터' : r === 'admin' ? '⚙️ 관리자' : '일반'
</script>
