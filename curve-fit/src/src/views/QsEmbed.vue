<script setup>
import { ref, onMounted } from 'vue'
// import { useQSStore } from '../store/app'
import * as QuickSightEmbedding from 'amazon-quicksight-embedding-sdk'

const container = ref(null)
// const store = useQSStore()
let mapWindow = {}

let dashboard

const onchangedQsParameters = (payload) => {
  // only triggered when mapWindow is properly set
  // if (Object.keys(mapWindow).length) {
    console.log('onchangedQSParams=', payload)
    mapWindow.postMessage({ messageType: 'selectFilterFromQsToCurveFit', filterParams: [payload.parameters] })
  // }
}

const onMessage = (event) => {
  // console.log(event.data)
  // console.log(event.origin, location.origin, event.data.messageType)
  // original
  //if (event.origin === location.origin && event.data) {
  // local develop
  if (event.data) {
    switch (event.data.messageType) {
      case 'initSetEmbedWindow':
        mapWindow = event.source
        break
    }
  }
  // console.log("mapWindow=", mapWindow)
}

window.addEventListener('message', onMessage, false)

onMounted(async () => {
  const containerDiv = document.getElementById("embeddingContainer");
  const options = {
    url: "https://ap-northeast-1.quicksight.aws.amazon.com/sn/embed/share/accounts/716990209761/dashboards/16cd477f-a86e-40cb-ba14-b0222eb63b74?directory_alias=sea-analytics",
    container: containerDiv,
    iframeResizeOnSheetChange: true,
    printEnabled: true,
    scrolling: 'auto',
    width: '100%',
    height: '100%',
    locale: 'en-US'
  }

  dashboard = QuickSightEmbedding.embedDashboard(options)
  // changed Paramater
  dashboard.on('parametersChange', onchangedQsParameters)
})
</script>

<template>
  <div
    id="embeddingContainer"
    ref="container"
    class="h-full"
  />
</template>

<style scoped>
#embeddingContainer {
  height: 95vh;
}
</style>
