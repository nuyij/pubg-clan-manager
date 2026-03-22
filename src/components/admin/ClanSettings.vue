<template>
  <div class="card p-6 space-y-6">
    <div class="section-title">🛡️ 클랜 설정 (마스터 전용)</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">클랜 이름</label>
        <input v-model="form.clan_name" type="text" placeholder="클랜 이름" class="input-field" maxlength="30" />
      </div>
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">클랜 로고 URL</label>
        <input v-model="form.clan_logo_url" type="url" placeholder="https://..." class="input-field" />
      </div>
    </div>
    <!-- 로고 미리보기 -->
    <div v-if="form.clan_logo_url" class="flex items-center gap-4 bg-clan-surface rounded p-3 border border-clan-border">
      <img :src="form.clan_logo_url" class="w-16 h-16 object-contain rounded border border-clan-border" @error="logoError = true" />
      <div>
        <div class="font-display font-bold text-clan-gold text-lg">{{ form.clan_name }}</div>
        <div class="text-xs text-clan-muted">미리보기</div>
        <div v-if="logoError" class="text-xs text-red-400 mt-1">⚠️ 이미지를 불러올 수 없습니다</div>
      </div>
    </div>
    <div class="bg-clan-surface rounded p-3 text-xs text-clan-muted border border-clan-border">
      💡 로고는 외부 URL을 사용하거나 Supabase Storage에 업로드 후 URL을 입력하세요.<br>
      Supabase Storage: Storage → New Bucket(public) → 파일 업로드 → URL 복사
    </div>
    <div class="flex justify-end items-center gap-3">
      <Transition name="fade">
        <span v-if="saved" class="text-green-400 font-mono text-sm">✅ 저장됨</span>
      </Transition>
      <button @click="save" :disabled="saving" class="btn-gold">{{ saving ? '저장 중...' : '클랜 설정 저장' }}</button>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
const store = useSettingsStore()
const saving = ref(false)
const saved = ref(false)
const logoError = ref(false)
const form = reactive({ clan_name: '', clan_logo_url: '' })
onMounted(sync); watch(() => store.settings, sync, { deep: true })
function sync() { form.clan_name = store.settings.clan_name ?? ''; form.clan_logo_url = store.settings.clan_logo_url ?? '' }
watch(() => form.clan_logo_url, () => logoError.value = false)
async function save() {
  saving.value = true
  try { await store.save({ clan_name: form.clan_name, clan_logo_url: form.clan_logo_url || null }); saved.value = true; setTimeout(() => saved.value = false, 2500) }
  catch (e) { alert('저장 실패: ' + e.message) }
  finally { saving.value = false }
}
</script>
<style scoped>.fade-enter-active,.fade-leave-active{transition:opacity .3s}.fade-enter-from,.fade-leave-to{opacity:0}</style>
