import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const member = ref(null) // DB의 members 행
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
  const role = computed(() => member.value?.role ?? 'user')
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'master')
  const isMaster = computed(() => role.value === 'master')
  const discordName = computed(() => user.value?.user_metadata?.full_name ?? '')
  const discordAvatar = computed(() => user.value?.user_metadata?.avatar_url ?? '')
  const discordId = computed(() => user.value?.user_metadata?.provider_id ?? user.value?.id ?? '')
  // 닉네임 미설정 여부
  const needsNickname = computed(() => isLoggedIn.value && !member.value?.clan_nickname)

  async function init() {
    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await loadMember()
    }
    loading.value = false
    supabase.auth.onAuthStateChange(async (_e, session) => {
      user.value = session?.user ?? null
      if (user.value) await loadMember()
      else member.value = null
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

  // 최초 닉네임 설정
  async function setNickname(clanNickname) {
    if (!user.value) throw new Error('로그인이 필요합니다')
    const did = user.value?.user_metadata?.provider_id ?? user.value.id
    // 이미 members 행이 있으면 update, 없으면 insert
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

  // 본인 배그 ID 수정
  async function setPubgName(pubgName) {
    if (!member.value) throw new Error('닉네임을 먼저 설정하세요')
    const { error } = await supabase.from('members')
      .update({ pubg_name: pubgName, pubg_account_id: null }) // ID 바뀌면 캐시 초기화
      .eq('id', member.value.id)
    if (error) throw new Error(error.message.includes('unique') ? '이미 등록된 배그 ID입니다' : error.message)
    await loadMember()
  }

  return { user, member, loading, isLoggedIn, isAdmin, isMaster, role, discordName, discordAvatar, discordId, needsNickname, init, loginWithDiscord, logout, setNickname, setPubgName, loadMember }
})
