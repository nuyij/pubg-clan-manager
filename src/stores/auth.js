import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const member = ref(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
  const role = computed(() => member.value?.role ?? 'user')
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'master')
  const isMaster = computed(() => role.value === 'master')
  const discordName = computed(() => user.value?.user_metadata?.full_name ?? '')
  const discordAvatar = computed(() => user.value?.user_metadata?.avatar_url ?? '')
  const discordId = computed(() => user.value?.user_metadata?.provider_id ?? user.value?.id ?? '')
  const needsNickname = computed(() => isLoggedIn.value && member.value && !member.value.is_pending && !member.value?.clan_nickname)
  // 승인 대기 중
  const isPending = computed(() => isLoggedIn.value && member.value?.is_pending === true)
  // 미가입 (members 행 없음)
  const isUnregistered = computed(() => isLoggedIn.value && !member.value)

  async function init() {
    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await loadMember()
    }
    loading.value = false
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user ?? null
      if (user.value) await loadMember()
      else member.value = null
      if (event === 'TOKEN_REFRESHED') await loadMember()
      if (event === 'SIGNED_OUT') { user.value = null; member.value = null }
    })
  }

  async function loadMember() {
    if (!user.value) return
    const did = user.value?.user_metadata?.provider_id ?? user.value.id
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', did)
      .maybeSingle()
    member.value = data ?? null
    // members 행 없으면 null 유지 (가입 신청 전 상태)
  }

  // 가입 신청 (Discord 로그인 후 버튼 클릭 시)
  async function requestJoin() {
    if (!user.value) throw new Error('로그인이 필요합니다')
    const did = user.value?.user_metadata?.provider_id ?? user.value.id
    const name = user.value?.user_metadata?.full_name ?? ''
    const { error } = await supabase.from('members').insert({
      discord_id: did,
      discord_name: name,
      status: '신규',
      role: 'user',
      is_pending: true,
    })
    if (error) {
      if (error.message.includes('unique')) throw new Error('이미 가입 신청이 되어 있습니다')
      throw new Error(error.message)
    }
    await loadMember()
  }

  async function loginWithDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    member.value = null
  }

  async function setNickname(clanNickname) {
    if (!user.value) throw new Error('로그인이 필요합니다')
    const did = user.value?.user_metadata?.provider_id ?? user.value.id
    if (member.value) {
      const { error } = await supabase.from('members')
        .update({ clan_nickname: clanNickname })
        .eq('id', member.value.id)
      if (error) throw new Error(error.message.includes('unique') ? '이미 사용 중인 닉네임입니다' : error.message)
    } else {
      const { error } = await supabase.from('members').insert({
        discord_id: did,
        clan_nickname: clanNickname,
        status: '신규',
        role: 'user',
      })
      if (error) throw new Error(error.message.includes('unique') ? '이미 사용 중인 닉네임입니다' : error.message)
    }
    await loadMember()
  }

  async function setPubgName(pubgName) {
    if (!member.value) throw new Error('닉네임을 먼저 설정하세요')
    const { error } = await supabase.from('members')
      .update({ pubg_name: pubgName, pubg_account_id: null })
      .eq('id', member.value.id)
    if (error) throw new Error(error.message.includes('unique') ? '이미 등록된 배그 ID입니다' : error.message)
    await loadMember()
  }

  return {
    user, member, loading,
    isLoggedIn, isAdmin, isMaster, role,
    discordName, discordAvatar, discordId,
    needsNickname, isPending, isUnregistered,
    init, loginWithDiscord, logout,
    setNickname, setPubgName, loadMember, requestJoin
  }
})
