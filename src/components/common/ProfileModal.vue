<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="card max-w-lg w-full p-6 animate-slide-up shadow-gold space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="font-display font-bold text-lg text-clan-gold tracking-wider">내 프로필</h3>
          <button @click="$emit('close')" class="text-clan-muted hover:text-clan-text">✕</button>
        </div>

        <!-- Discord 정보 -->
        <div class="flex items-center gap-3 bg-clan-surface rounded-lg p-3">
          <img v-if="auth.discordAvatar" :src="auth.discordAvatar" class="w-12 h-12 rounded-full border-2 border-clan-gold/30" />
          <div>
            <div class="text-sm font-bold text-clan-text">{{ auth.discordName }}</div>
            <div class="text-xs text-clan-muted font-mono">ID: {{ auth.discordId }}</div>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block', roleClass(auth.role)]">
              {{ roleLabel(auth.role) }}
            </span>
          </div>
        </div>

        <!-- 클랜 닉네임 -->
        <div>
          <label class="block text-xs text-clan-muted font-mono tracking-wider mb-2">클랜 닉네임 (중복 불가)</label>
          <div class="flex gap-2">
            <input v-model="nicknameInput" type="text" placeholder="클랜 내 닉네임" class="input-field flex-1" maxlength="20" />
            <button @click="saveNickname" :disabled="saving || !nicknameInput.trim()" class="btn-gold px-4 whitespace-nowrap">
              {{ auth.member?.clan_nickname ? '변경' : '설정' }}
            </button>
          </div>
          <div class="text-xs text-clan-muted mt-1">현재: <span class="text-clan-text">{{ auth.member?.clan_nickname || '미설정' }}</span></div>
        </div>

        <!-- 배그 계정 관리 (최대 5개) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-clan-muted font-mono tracking-wider">배그 인게임 ID 관리 (최대 5개)</label>
            <span class="text-xs font-mono" :class="pubgAccounts.length >= 5 ? 'text-red-400' : 'text-clan-muted'">
              {{ pubgAccounts.length }}/5
            </span>
          </div>

          <!-- 등록된 계정 목록 -->
          <div class="space-y-2 mb-3">
            <div v-for="acc in pubgAccounts" :key="acc.id"
              class="flex items-center gap-2 bg-clan-surface rounded p-2 border border-clan-border">
              <div class="flex-1 min-w-0">
                <div class="font-mono text-sm text-clan-text truncate">{{ acc.pubg_name }}</div>
                <div v-if="acc.is_primary" class="text-[10px] text-clan-gold font-mono">★ 기본 계정</div>
              </div>
              <button v-if="!acc.is_primary" @click="setPrimary(acc)"
                class="text-[10px] px-2 py-1 border border-clan-border text-clan-muted hover:border-clan-gold hover:text-clan-gold rounded transition-colors whitespace-nowrap">
                기본으로
              </button>
              <button @click="removeAccount(acc)"
                class="text-[10px] px-2 py-1 border border-red-700/40 text-red-400 hover:bg-red-900/30 rounded transition-colors">
                삭제
              </button>
            </div>
            <div v-if="!pubgAccounts.length" class="text-xs text-clan-muted text-center py-2 bg-clan-surface rounded border border-clan-border">
              등록된 배그 계정이 없습니다
            </div>
          </div>

          <!-- 새 계정 추가 -->
          <div v-if="pubgAccounts.length < 5" class="flex gap-2">
            <input v-model="newPubgName" type="text" placeholder="추가할 배그 인게임 닉네임"
              class="input-field flex-1" @keyup.enter="addPubgAccount" />
            <button @click="addPubgAccount" :disabled="saving || !newPubgName.trim()" class="btn-gold px-4 whitespace-nowrap">
              추가
            </button>
          </div>
          <div v-else class="text-xs text-center text-red-400 font-mono py-1">
            최대 5개까지 등록 가능합니다
          </div>
          <div class="text-xs text-yellow-500 mt-1">※ 배그 닉네임 변경 시 반드시 수정해주세요</div>
        </div>

        <!-- 메시지 -->
        <div v-if="msg" :class="['text-sm text-center font-mono py-1', msgType==='error' ? 'text-red-400' : 'text-green-400']">
          {{ msg }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const props = defineProps({ show: Boolean })
defineEmits(['close'])
const auth = useAuthStore()

const nicknameInput = ref('')
const newPubgName = ref('')
const pubgAccounts = ref([])
const saving = ref(false)
const msg = ref('')
const msgType = ref('success')

watch(() => props.show, async (v) => {
  if (v) {
    nicknameInput.value = auth.member?.clan_nickname ?? ''
    newPubgName.value = ''
    msg.value = ''
    await loadAccounts()
  }
})

async function loadAccounts() {
  if (!auth.member) return
  const { data } = await supabase
    .from('member_pubg_accounts')
    .select('*')
    .eq('member_id', auth.member.id)
    .order('is_primary', { ascending: false })
  pubgAccounts.value = data ?? []
}

async function saveNickname() {
  if (!nicknameInput.value.trim()) return
  saving.value = true; msg.value = ''
  try {
    await auth.setNickname(nicknameInput.value.trim())
    showMsg('닉네임이 저장되었습니다', 'success')
  } catch (e) { showMsg(e.message, 'error') }
  finally { saving.value = false }
}

async function addPubgAccount() {
  if (!newPubgName.value.trim() || !auth.member) return
  if (pubgAccounts.value.length >= 5) { showMsg('최대 5개까지만 등록 가능합니다', 'error'); return }
  saving.value = true; msg.value = ''
  try {
    const isPrimary = pubgAccounts.value.length === 0
    const { error } = await supabase.from('member_pubg_accounts').insert({
      member_id: auth.member.id,
      pubg_name: newPubgName.value.trim(),
      is_primary: isPrimary,
    })
    if (error) throw new Error(error.message.includes('unique') ? '이미 등록된 배그 ID입니다' : error.message)
    // 기본 계정이면 members.pubg_name도 업데이트
    if (isPrimary) {
      await supabase.from('members').update({ pubg_name: newPubgName.value.trim() }).eq('id', auth.member.id)
      await auth.loadMember()
    }
    newPubgName.value = ''
    await loadAccounts()
    showMsg('배그 계정이 추가되었습니다', 'success')
  } catch (e) { showMsg(e.message, 'error') }
  finally { saving.value = false }
}

async function setPrimary(acc) {
  if (!auth.member) return
  saving.value = true
  try {
    // 기존 기본 해제
    await supabase.from('member_pubg_accounts')
      .update({ is_primary: false })
      .eq('member_id', auth.member.id)
    // 새 기본 설정
    await supabase.from('member_pubg_accounts')
      .update({ is_primary: true })
      .eq('id', acc.id)
    // members.pubg_name도 업데이트
    await supabase.from('members').update({ pubg_name: acc.pubg_name }).eq('id', auth.member.id)
    await auth.loadMember()
    await loadAccounts()
    showMsg(`${acc.pubg_name}을 기본 계정으로 설정했습니다`, 'success')
  } catch (e) { showMsg(e.message, 'error') }
  finally { saving.value = false }
}

async function removeAccount(acc) {
  if (!confirm(`${acc.pubg_name}을 삭제할까요?`)) return
  saving.value = true
  try {
    await supabase.from('member_pubg_accounts').delete().eq('id', acc.id)
    // 삭제한 게 기본 계정이면 첫 번째 것을 기본으로
    if (acc.is_primary) {
      const remaining = pubgAccounts.value.filter(a => a.id !== acc.id)
      if (remaining.length) {
        await supabase.from('member_pubg_accounts').update({ is_primary: true }).eq('id', remaining[0].id)
        await supabase.from('members').update({ pubg_name: remaining[0].pubg_name }).eq('id', auth.member.id)
      } else {
        await supabase.from('members').update({ pubg_name: null }).eq('id', auth.member.id)
      }
      await auth.loadMember()
    }
    await loadAccounts()
    showMsg('삭제되었습니다', 'success')
  } catch (e) { showMsg(e.message, 'error') }
  finally { saving.value = false }
}

function showMsg(text, type) { msg.value = text; msgType.value = type; setTimeout(() => msg.value = '', 3000) }
const roleClass = (r) => r==='master' ? 'bg-yellow-600/30 text-yellow-400' : r==='admin' ? 'bg-blue-900/30 text-blue-400' : 'bg-clan-surface text-clan-muted'
const roleLabel = (r) => r==='master' ? '👑 마스터' : r==='admin' ? '⚙️ 관리자' : '일반 유저'
</script>
