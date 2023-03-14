<template>
  <div class="about">
    <div class="head">Reactive AIS Charter Party</div>
      <!--IMO-->
      <div class="itemcol">IMO number: </div><div class="valuecol">{{ selectedImo }}</div><br>
      <!--ShipName-->
      <div class="itemcol">Ship name: </div><div class="valuecol">{{ selectedShip }}</div><br>
      <!--Beaufort-->
      <div class="itemcol">Beaufort scale: </div><div class="valuecol">{{ selectedBeaufort }}</div><br>
      <!--SigWave-->
      <div class="itemcol">SIGWAVE: </div><div class="valuecol">{{ selectedSigWave }}</div><br>
      <!--Adv-->
      <div class="itemcol">{{ getAdvCurrentDescription( selectedAdvCurrent ) }}</div>
      <div id="plotly"></div>
  </div>
</template>

<script setup>
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"
import Plotly from 'plotly.js-dist'
import regression from 'regression'
import { reactive, ref, watch, onMounted } from "vue"

// credentials for local development
// copy and paste 
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
const sessionToken = import.meta.env.VITE_AWS_SESSION_TOKEN
const awsCredentialHeader = {
    'Authorization': `AWS ${accessKeyId}:${secretAccessKey}`
  }

// constants
const DATA_STORAGE_URL = 'https://d3uvvhom913tgh.cloudfront.net/data'

// data
const imoList = ref([])
const aisData = {"sog": {}, "foc": {}, "beaufort": {}, "HTSGW": {}, "is_forward_CNT": {}}
let aisShow = {"sog": {}, "foc": {}}
const cpData = {"sog": {}, "foc": {}, "beaufort": {}, "HTSGW": {}, "is_forward_CNT": {}}

// reactive variables
const selectedShip = ref()
const selectedImo = ref()
const selectedBeaufort = ref()
const selectedSigWave = ref()
const selectedAdvCurrent = ref()
const beaufort = reactive({min:0, max:12, colName: "beaufort", filterType: "between"})
const sigwave = reactive({min:0, max:10, colName: "HTSGW", filterType: "between"})
const advCurrent = reactive({val:0, colName: "is_forward_CNT", filterType: "contain"})

// status
const dataReady = ref(false)
const displayReady = ref(false)

onMounted(async () => {

  // get data
  getData()

  // watch
  // watch(selectedImo, () => { 
  //   renewShowValue()
  //   updatePlot()
  //   displayReady.value = true
  // }, { immediate: true })

  /**
   * トップのWindowにマップを埋め込んでいるiframeのidを渡す。
   */
   if (window.parent !== window) {
    window.top.postMessage({ messageType: 'initSetEmbedWindow' }, window.origin)
    // local development
    // window.top.postMessage({ messageType: 'initSetEmbedWindow' }, "https://dev.localhost:3000/")
  }

  /**
   * 親WindowからのpostMessageを受け取る。
   */
  const onMessage = (event) => {
    if (event.origin === location.origin && event.data) {
      if (event.data.messageType === "selectFilterFromQsToCurveFit") {
        event.data.filterParams[0].forEach((item) => {
          switch (item.name) {
            case 'shipfilter':
              selectedShip.value = item.value
              console.log("ship=", item.value)
              break
            case 'imofilter':
              selectedImo.value = item.value
              console.log("imo=", item.value)
              break
            case 'sigwavefilter':
              selectedSigWave.value = item.value
              console.log("SIGWAVE=", item.value)
              break
            case 'advcurrentfilter':
              selectedAdvCurrent.value = item.value
              console.log("adv=", item.value)
              break
            case 'beaufortfilter':
              selectedBeaufort.value = item.value
              console.log("beaufort=", item.value)
              break
          }
        })
      }
    }
  }
  console.log(selectedShip.value)
  window.removeEventListener('message', onMessage)
  window.addEventListener('message', onMessage, false)
  console.log(selectedShip.value)
})

// watch
// watch(beaufort, () => {
//   resetShowValue()
//   setFilter(beaufort)
//   updatePlot()
// })

// watch(sigwave, () => {
//   resetShowValue()
//   setFilter(sigwave)
//   updatePlot()
// })

// watch(advCurrent, (newValue) => {
//   resetShowValue()
//   setFilter(advCurrent)
//   updatePlot()
// })

// functions
const changeAdvCurrent = (newValue) => {
  advCurrent.val = newValue
  // css of buttons
  const hasAdvCurrent = document.getElementsByClassName("hasAdvCurrent")[0]
  const noAdvCurrent = document.getElementsByClassName("noAdvCurrent")[0]
  if (newValue === 1) {
    hasAdvCurrent.classList.add('active')
    noAdvCurrent.classList.remove('active')
  } else {
    hasAdvCurrent.classList.remove('active')
    noAdvCurrent.classList.add('active')
  }
}

const getAdvCurrentDescription = (advCurrent) => {
  if (advCurrent === 0) {
    return "Adverse current is not included."
  } else if (advCurrent === 1) {
    return "Adverse current is included."
  }
}

const renewShowValue = () => {
  aisShow.sog = aisData.sog[selectedImo.value]
  aisShow.foc = aisData.foc[selectedImo.value]
}

const resetShowValue = () => {
  aisShow.sog = []
  aisShow.foc = []
}

const setFilter = (obj) => {
  const goodFlag = []
  aisData[obj.colName][selectedImo.value].forEach((val,idx) => {
    if (obj.filterType === "between") {
      if (val >= obj.min && val <= obj.max) {
        goodFlag.push(idx)
      }
    } else if (obj.filterType === "contain") {
      if (val === obj.val) {
        goodFlag.push(idx)
      }
    }
  })

  goodFlag.forEach((idx) => {
    aisShow.sog.push(aisData.sog[selectedImo.value][idx])
    aisShow.foc.push(aisData.foc[selectedImo.value][idx])
  })
}

const updatePlot = () => {
  const curveData = calcRegression()
  display(curveData)
}

const getData = async () => {
  // read local file
  // d3.csv("test.csv", function(data) {
  //   initArray(data.imo_num)
  //   processData(data, "AIS")
  // })
  // d3.csv("test_cp.csv", function(data) {
  //   processData(data, "CP")
  // })
  dataReady.value = true 

  const result = await fetch(`${DATA_STORAGE_URL}/test_cp.csv`, {
    method: "GET",
    // headers: awsCredentialHeader,
    mode: "cors"
  })
  .then((res) => res.text())
  .then((val) => d3.csvParse(val))
  // console.log(result)
}

const initArray = (imo) => {
  // first occurrence
  if (!(imoList.value.includes(imo))) {
    imoList.value.push(imo)
    aisData.sog[imo] = []
    aisData.foc[imo] = []
    aisData.beaufort[imo] = []
    aisData.HTSGW[imo] = []
    aisData.is_forward_CNT[imo] = []
    cpData.sog[imo] = []
    cpData.foc[imo] = []
  }
}

const processData = (data, dataType) => {
  if (dataType === "AIS") {
    aisData.sog[data.imo_num].push(data.sog)
    aisData.foc[data.imo_num].push(data.focperday)
    aisData.beaufort[data.imo_num].push(data.beaufort)
    aisData.HTSGW[data.imo_num].push(data.HTSGW)
    aisData.is_forward_CNT[data.imo_num].push(data.is_forward_CNT)
  } else if (dataType === "CP") {
    cpData.sog[data.imo_num].push(data.sog)
    cpData.foc[data.imo_num].push(data.focperday)
  }
}

const calcRegression = () => {
  const sogData = aisShow.sog
  const focData = aisShow.foc

  const regData = []
  for (let i = 0; i < sogData.length; i++) {
    regData.push([sogData[i], focData[i]])
  }
  const result = regression.polynomial(regData, { order: 3 })

  // create polynomial function
  const getRegressionValue = (x) => {
    const y = result.equation[0] * x ** 3 +
    result.equation[1] * x ** 2 +
    result.equation[2] * x ** 1 +
    result.equation[3]
    return y
  }
  
  // generate curve for displayRegression
  const curveData = []
  for (let i = 0; i < 301; i++) {
    const xValue = i / 10
    curveData.push(getRegressionValue(xValue))
  }

  return curveData
}

const display = (data) => {
  // display AIS scatter
  const traceAis = {
    x: [...aisShow.sog],
    y: [...aisShow.foc],
    name: "AIS",
    mode: 'markers',
    type: 'scatter',
    marker: { color: 'blue' }
  }
  // display CP scatter
  const traceCp = {
    x: [...cpData.sog[selectedImo.value]],
    y: [...cpData.foc[selectedImo.value]],
    name: "Charter Party",
    mode: 'markers',
    type: 'scatter',
    marker: { color: 'red' }
  }
  // display regression line
  const traceReg = {
    x: [...Array(301).keys()].map(x => x / 10),
    y: data,
    name: "cubic curve",
    type: 'scatter',
    marker: { color: 'green' }
  }
  Plotly.newPlot('plotly', [traceAis, traceCp, traceReg])
}
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: inline-block;
    align-items: center;
  }
}

.head {
  padding-top: 5%;
  font-size: 24px;
  font-weight: bold;
}

.itemcol {
  font-size: 18px;
  font-weight: bold;
  display: inline;
}

.valuecol {
  font-size: 15px;
  font-weight: normal;
  display: inline;
}

.subhead {
  font-size: 15px;
  font-weight: bold;
}

.tabs {
  /* color: white;
  font-family: Arial; */
  /* position: relative; */
  width: 60px;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid #a5a5a5;
  border-radius: 8px;
  padding: 5px;
  margin-top: 4px;
}

.tabs:hover {
  border: 2px solid #000000;
}

.tabs.active {
  background-color: hsla(160, 100%, 37%, 1);
}

input {
  width: 60px;
  font-family: Arial;
  font-size: 12px;
  border: 2px solid #a5a5a5;
  border-radius: 8px;
  padding: 5px;
  margin-top: 4px;
}

input:hover {
  border: 2px solid #000000;
}

/* input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
} */

select {
  width: 120px;
  font-family: Arial;
  font-size: 15px;
  border: 2px solid #a5a5a5;
  border-radius: 8px;
  padding: 5px;
  margin-top: 4px;
}

select:hover {
  border: 2px solid #000000;
}
</style>
