import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useQSStore = defineStore('QSfilter', () => {
  const imoQS = ref("zzz")
  const shipQS = ref("zzz")
  const beaufortQS = ref(0)
  const sigwaveQS = ref(0)
  const advcurrentQS = ref(0)

  return {
    imoQS,
    shipQS,
    beaufortQS,
    sigwaveQS,
    advcurrentQS,
    setImo (value) { imoQS.value = value },
    setShip (value) { shipQS.value = value },
    setBeaufort (value) { beaufortQS.value = value },
    setSigwave (value) { sigwaveQS.value = value },
    setAdvcurrent (value) { advcurrentQS.value = value },
  }
})
