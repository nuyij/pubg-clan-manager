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

    <!-- 로고 직접 업로드 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="text-xs text-clan-muted font-mono tracking-wider">📁 로고 직접 업로드</div>
      <div class="flex items-center gap-3 flex-wrap">
        <label class="cursor-pointer">
          <div class="btn-outline text-xs px-4 py-2 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            파일 선택
          </div>
          <input type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
        </label>
        <span v-if="selectedFile" class="text-xs text-clan-muted font-mono">{{ selectedFile.name }}</span>
        <button v-if="selectedFile" @click="uploadLogo" :disabled="uploading" class="btn-gold text-xs px-4 py-2">
          {{ uploading ? '업로드 중...' : '업로드' }}
        </button>
      </div>
      <div v-if="uploadError" class="text-red-400 text-xs font-mono">⚠️ {{ uploadError }}</div>
      <div v-if="uploadSuccess" class="text-green-400 text-xs font-mono">✅ 업로드 완료! URL이 자동으로 입력되었습니다.</div>
      <div class="text-xs text-clan-muted">PNG, JPG, GIF, WebP · 최대 2MB · 권장 크기 256x256</div>
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
import { supabase } from '@/lib/supabase'

const store = useSettingsStore()
const saving = ref(false)
const saved = ref(false)
const logoError = ref(false)
const form = reactive({ clan_name: '', clan_logo_url: '' })

const selectedFile = ref(null)
const uploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref(false)

onMounted(sync)
watch(() => store.settings, sync, { deep: true })
function sync() {
  form.clan_name = store.settings.clan_name ?? ''
  form.clan_logo_url = store.settings.clan_logo_url ?? ''
}
watch(() => form.clan_logo_url, () => logoError.value = false)

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = '파일 크기가 2MB를 초과합니다'
    return
  }
  uploadError.value = ''
  uploadSuccess.value = false
  selectedFile.value = file
}

async function uploadLogo() {
  if (!selectedFile.value) return
  uploading.value = true
  uploadError.value = ''
  uploadSuccess.value = false
  try {
    const ext = selectedFile.value.name.split('.').pop()
    const fileName = `clan-logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('clan-assets')
      .upload(fileName, selectedFile.value, { upsert: true, contentType: selectedFile.value.type })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from('clan-assets').getPublicUrl(fileName)
    form.clan_logo_url = data.publicUrl
    uploadSuccess.value = true
    selectedFile.value = null
  } catch (e) {
    uploadError.value = e.message.includes('Bucket not found')
      ? 'clan-assets 버킷이 없습니다. Supabase Storage에서 생성해주세요.'
      : e.message
  } finally {
    uploading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await store.save({ clan_name: form.clan_name, clan_logo_url: form.clan_logo_url || null })
    saved.value = true
    setTimeout(() => saved.value = false, 2500)
  } catch (e) {
    alert('저장 실패: ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>
<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .3s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>