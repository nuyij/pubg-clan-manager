<template>
  <div class="card p-6 space-y-6">
    <div class="section-title">📐 점수 산출 공식 설정</div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">킬 가중치</label>
        <input v-model.number="form.kill_weight" type="number" min="0" step="0.5" class="input-field" />
      </div>
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">어시스트 가중치</label>
        <input v-model.number="form.assist_weight" type="number" min="0" step="0.5" class="input-field" />
      </div>
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">신규/텟생 동반 가산율</label>
        <input v-model.number="form.newbie_bonus" type="number" min="1" step="0.1" class="input-field" />
      </div>
    </div>
    <div>
      <div class="text-xs text-clan-muted font-mono tracking-wider mb-3">순위별 배점 (1위 ~ 10위)</div>
      <div class="grid grid-cols-5 gap-2">
        <div v-for="i in 10" :key="i">
          <label class="block text-center text-xs mb-1" :class="i <= 3 ? 'text-clan-gold' : 'text-clan-muted'">{{ i }}위</label>
          <input v-model.number="form.rank_scores[i]" type="number" min="0" class="input-field text-center px-1" />
        </div>
      </div>
    </div>
    <div class="bg-clan-surface rounded p-3 font-mono text-xs text-clan-text-dim border border-clan-border space-y-1">
      <div class="text-clan-gold mb-1">공식 미리보기</div>
      <div>베스트 = (킬 × <span class="text-white">{{ form.kill_weight }}</span>) + (어시 × <span class="text-white">{{ form.assist_weight }}</span>) + 순위점수</div>
      <div>기여도 = 파티인원 × 10 × <span class="text-white">{{ form.newbie_bonus }}</span> (신규동반시)</div>
    </div>
    <div class="flex justify-end items-center gap-3">
      <Transition name="fade">
        <span v-if="saved" class="text-green-400 font-mono text-sm">✅ 저장됨</span>
      </Transition>
      <button @click="save" :disabled="saving" class="btn-gold flex items-center gap-2">
        <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        {{ saving ? '저장 중...' : '설정 저장' }}
      </button>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
const store = useSettingsStore()
const saving = ref(false)
const saved = ref(false)
const form = reactive({ kill_weight: 10, assist_weight: 5, newbie_bonus: 1.5, rank_scores: {1:30,2:25,3:20,4:15,5:12,6:9,7:6,8:4,9:2,10:1} })
onMounted(sync); watch(() => store.settings, sync, { deep: true })
function sync() { form.kill_weight = store.settings.kill_weight; form.assist_weight = store.settings.assist_weight; form.newbie_bonus = store.settings.newbie_bonus; form.rank_scores = { ...store.settings.rank_scores } }
async function save() {
  saving.value = true
  try { await store.save({ kill_weight: form.kill_weight, assist_weight: form.assist_weight, newbie_bonus: form.newbie_bonus, rank_scores: { ...form.rank_scores } }); saved.value = true; setTimeout(() => saved.value = false, 2500) }
  catch (e) { alert('저장 실패: ' + e.message) }
  finally { saving.value = false }
}
</script>
<style scoped>.fade-enter-active,.fade-leave-active{transition:opacity .3s}.fade-enter-from,.fade-leave-to{opacity:0}</style>
