<template>
  <div class="about">
    <div class="head">AIS Performance Table Verification</div>
    <!--Clinet-->
    <div class="itemcol">Client: </div>
    <select
      class="leglist"
      v-model="client"
    >
      <option
        v-for="client in clientList"
        :key="client"
        :value="client"
        :label="client"
      />
    </select>
    <br>
    <!--Leg-->
    <div
      class="itemcol"
      v-if="legReady">leg: </div>
    <select
      class="leglist"
      v-model="selectedLeg"
      v-if="legReady"
    >
      <option
        v-for="leg in legList"
        :key="leg"
        :value="leg"
        :label="leg.rowNum + '. ' + leg['Ship Name'] + ' (' + leg.legName + ')'"
      /> 
    </select>
    <br>
      <div
        class="numinp"
        v-if="displayReady">
        <div class="category">Basic Info</div>
        <!--IMO-->
        <div class="itemcol">IMO: </div>{{ selectedImo }}
        <br>
        <!--ShipName-->
        <div class="itemcol">Ship name: </div>{{ selectedShip }}
        <br>
        <!--ShipType-->
        <div class="itemcol">WNI Ship type: </div>{{ selectedShipType }}
        <br>
        <!--ShipType-->
        <div class="itemcol">GT: </div>{{ selectedGt }}
        <br>
        <!--ShipType-->
        <div class="itemcol">DWT: </div>{{ selectedDwt }}
        <br>
        <!--Period-->
        <div class="itemcol">Period: </div>
        {{ new Date(deparr.min).toLocaleString() }} - {{ new Date(deparr.max).toLocaleString() }}
        <br>
        <!--Beaufort-->
        <div class="itemcol">Beaufort scale: </div>
       {{ beaufort.min }} - {{ beaufort.max }}
        <br>
        <!--SigWave-->
        <div class="itemcol">SIGWAVE: </div>
        {{ sigwave.min }} - {{ sigwave.max }} (m)
        <br>
        <!--Adv-->
        <div class="itemcol">Adverse current: </div>
        {{ getAdvCurrentDescription(advCurrent.val) }}
        <br>
      </div>
      <div
        class="aisest"
        v-if="displayReady">
        <div class="category">Comparison</div>
        <table>
          <tr>
            <th class="row-name"></th>
            <th>Average Speed</th>
            <th>Current Factor</th>
            <th>Performance Speed</th>
            <th>Daily FO</th>
            <th>Loading Condition</th>
          </tr>
          <tr>
            <th class="row-name">AIS</th>
            <td>{{ aisAveSpd.toFixed(2) }} {{ aisSpdDiff }}</td>
            <td>{{ aisCF.toFixed(2) }}</td>
            <td>{{ aisPerfSpd.toFixed(2) }} {{ aisPerfSpdDiff }}</td>
            <td>{{ aisFOC.toFixed(2) }} {{ aisFOCRatio }}</td>
            <td>{{ aisLB }}</td>
          </tr>
          <!-- <tr>
            <th class="row-name">AIS (10kt)</th>
            <td>{{ aisOldAveSpd.toFixed(2) }} {{ aisOldSpdDiff }}</td>
            <td>{{ aisOldCF }}</td>
            <td>{{ aisOldPerfSpd }}</td>
            <td>{{ aisOldFOC.toFixed(2) }} {{ aisOldFOCRatio }}</td>
            <td>{{ aisOldLB }}</td>
          </tr> -->
          <tr>
            <th class="row-name">VAR</th>
            <td>{{ varAveSpd }}</td>
            <td>{{ varCF }}</td>
            <td>{{ varPerfSpd }}</td>
            <td>{{ varFOC }}</td>
            <td>{{ varLB }}</td>
          </tr>
        </table>
        <div class="filter">
          <input
            v-model="spdLimitToggle"
            type="checkbox"
            name="speedfilter">
          <label for="speedfilter"> Use 10kt filter</label>
        </div>
      </div>
      <div 
        v-show="(displayReady && !curveReady)">
        <img src="/public/preloader.gif">
      </div>
      <div 
        v-show="curveReady"
        id="plotly">
      </div>
      <div 
        v-show="curveReady"
        id="plotlymap">
      </div>
  </div>
</template>

<script setup>
import Plotly, { d3 } from 'plotly.js-dist'
import { csv } from 'd3'
import { reactive, ref, watch, onMounted } from "vue"
import Table from './Table.vue'

// constants
const DATA_STORAGE_URL = 'https://d3uvvhom913tgh.cloudfront.net/data'

// data
const clientList = ref(['GDN', 'EIB', 'dAmico', 'Oldendorff', 'RWE'])
const legList = ref([])
const imoList = ref([])
const shipList = ref([])
const shipTypeList = ref([])
const dwtList = ref([])
const gtList = ref([])
let aisDisplay = ref({ sog:[], foc:[], dt:[] })
let aisDisplayOld = ref({ sog:[], foc:[], dt:[] })
let aisMap = ref({ sog:[], foc:[], dt:[], latitude: [], longitude: [] })
let aisCalc = ref({ sog:[], foc:[], load_condition:[], cf:[], dt:[], hdg:[], cntrot:[], cntspd:[], date:[] })
let aisCalcOld = ref({ sog:[], foc:[], load_condition:[], cf:[], dt:[], hdg:[], cntrot:[], cntspd:[], date:[] })
const tableData = ref({ ais: { sog:[], foc:[], load_condition:[] }})
let aisImoData
let aisImoDataOld
const eibIdx = [17,19,22,28,29,31,37]
const dAmicoIdx = [44,51,55,61,62,64,66]

// selections
const client = ref([])
const selectedLeg = ref()
const spdLimitToggle = ref(true)

// Info
const selectedShip = ref("")
const selectedImo = ref("")
const selectedShipType = ref("")
const selectedGt = ref("")
const selectedDwt = ref("")

// VAR
const varAveSpd = ref()
const varPerfSpd = ref()
const varCF = ref()
const varFOC = ref()
const varLB = ref()

// AIS
const aisAveSpd = ref()
const aisPerfSpd = ref()
const aisCF = ref()
const aisFOC = ref()
const aisLB = ref()
const aisSpdDiff = ref()
const aisPerfSpdDiff = ref()
const aisFOCRatio = ref()

// AIS (10kt)
const aisOldAveSpd = ref()
const aisOldPerfSpd = ref()
const aisOldCF = ref()
const aisOldFOC = ref()
const aisOldLB = ref()
const aisOldSpdDiff = ref()
const aisOldFOCRatio = ref()

// filters
const beaufort = reactive({min:0, max:12, colName: "beaufort", filterType: "between"})
const sigwave = reactive({min:0, max:10, colName: "HTSGW", filterType: "between"})
const advCurrent = reactive({val:-1, colName: "is_forward_CNT", filterType: "equal",ext:[null]})
const deparr = reactive({min:-1, max:0, colName: "date", filterType: "dateWithin"})
const spdLimit = reactive({val:10, colName: "sog", filterType: "GT"})

// status
const legReady = ref(false)
const displayReady = ref(false)
const curveReady = ref(false)

onMounted(async () => {

  // get data
  getData()

  // watch
  watch(client, async (newValue) => {
    legList.value = []
    legReady.value = false
    displayReady.value = false
    curveReady.value = false
    csv(`${DATA_STORAGE_URL}/client/${newValue}.csv`)
      .then((data) => {
        data.forEach((d, idx) => {
          d.legName = d.Departure + " → " + d.Arrival
          switch (newValue) {
            case 'Oldendorff':
              d.rowNum = idx + 5
              break
            case 'RWE':
              d.rowNum = idx + 5
              break
            case 'dAmico':
              d.rowNum = dAmicoIdx[idx]
              break
            case 'EIB':
              d.rowNum = eibIdx[idx]
              break
            case 'GDN':
              d.rowNum = idx + 5
              break
          }
          legList.value.push(d)
        })
      }).then(() => {
        legReady.value = true
      })
  })

  watch(selectedLeg, async (newValue) => {
    // console.log(selectedLeg.value)
    curveReady.value = false
    selectedImo.value = selectedLeg.value.IMO
    selectedShip.value = selectedLeg.value['Ship Name']
    const imoIndex = imoList.value.indexOf(selectedLeg.value.IMO)
    selectedShipType.value = shipTypeList.value[imoIndex]
    selectedGt.value = gtList.value[imoIndex]
    selectedDwt.value = dwtList.value[imoIndex]
    varAveSpd.value = selectedLeg.value['VAR Ave Speed']
    varPerfSpd.value = selectedLeg.value['VAR Perf Speed']
    varCF.value = selectedLeg.value['VAR CF']
    varFOC.value = selectedLeg.value['VAR FOC']
    varLB.value = selectedLeg.value['VAR LB']
    sigwave.max = getWaveHeight(selectedLeg.value['Wave Height'])
    beaufort.max = parseInt(selectedLeg.value.Beaufort.match(/\d+/)[0])
    advCurrent.val = selectedLeg.value['Adv Current'] === 'NoAdv' ? 1 : -1
    deparr.min =  selectedLeg.value.ATD
    deparr.max =  selectedLeg.value.ATA
    await Promise.all([
      getAISData(selectedLeg.value.IMO)
    ]).then(() => {
      setFilter()
      // setFilterOld()
      displayReady.value = true
      updatePlot()
    })
  })

  watch(spdLimitToggle, (newValue) => {
    if (newValue) {
      spdLimit.val = 10
    } else {
      spdLimit.val = 0
    }
    setFilter()
    // setFilterOld()
    updatePlot()
  })

})


// functions
const getAdvCurrentDescription = (advCurrent) => {
  if (advCurrent === 1) {
    return "NoAdv"
  } else if (advCurrent === -1) {
    return "All"
  }
}

const getAISData = async (imo) => {
  if (imo) {
    resetAisData()
    resetAisCalcData()
    resetAisDisplayData()
    // const result_10kt = await fetch(`${DATA_STORAGE_URL}/qs/${imo}.json`, {
    //   method: "GET",
    //   mode: "cors"
    // })
    // .then((res) => res.json())
    // .then((res) => {
    //   res.forEach((item, idx) => {
    //     console.log(item)
    //     if (item.SECA === 0) {
    //       aisImoDataOld.sog.push(item.sog)
    //       aisImoDataOld.foc.push(item.focperday)
    //       aisImoDataOld.beaufort.push(item.beaufort)
    //       aisImoDataOld.HTSGW.push(item.HTSGW)
    //       aisImoDataOld.is_forward_CNT.push(item.is_forward_CNT)
    //       aisImoDataOld.load_condition.push(item.load_condition)
    //       aisImoDataOld.date.push(item.received_date)
          // aisImoDataOld.dt.push(item.time_interval)
          // aisImoDataOld.hdg.push(item.hdg)
          // aisImoDataOld.CNTROT.push(item.CNTROT)
          // aisImoDataOld.CNTSPD.push(item.CNTSPD)
          // aisImoDataOld.latitude.push(item.latitude)
          // aisImoDataOld.longitude.push(item.longitude)
    //     }
    //   })
    // })
    // resetAisData('5')
    // resetAisCalcData('5')
    // resetAisDisplayData('5')
    const result = await fetch(`${DATA_STORAGE_URL}/qs_verification/${imo}.json`, {
      method: "GET",
      mode: "cors"
    })
    .then((res) => res.json())
    .then((res) => {
      res.forEach((item, idx) => {
        if (item.SECA === 0) {
          // console.log(item)
          aisImoData.sog.push(item.sog)
          aisImoData.foc.push(item.focperday)
          aisImoData.beaufort.push(item.beaufort)
          aisImoData.HTSGW.push(item.HTSGW)
          aisImoData.is_forward_CNT.push(item.is_forward_CNT)
          aisImoData.load_condition.push(item.load_condition)
          aisImoData.date.push(item.received_date)
          aisImoData.dt.push(item.time_interval)
          aisImoData.hdg.push(item.hdg)
          aisImoData.CNTROT.push(item.CNTROT)
          aisImoData.CNTSPD.push(item.CNTSPD)
          aisImoData.latitude.push(item.latitude)
          aisImoData.longitude.push(item.longitude)
        }
      })
      // console.log(aisImoData.date)
    })
  }
}

// reset functions
const resetAisData = () => {
  // if (ver === '5') {
    aisImoData = { "sog": [], "foc": [], "beaufort":[], "HTSGW": [],
                "is_forward_CNT": [], "load_condition": [], "date": [], "dt": [],
                "hdg": [], "CNTROT": [], "CNTSPD": [], "latitude": [], "longitude": [] }
  // } else if (ver === '10') {
  //   aisImoDataOld = { "sog": [], "foc": [], "beaufort":[], "HTSGW": [],
  //               "is_forward_CNT": [], "load_condition": [], "date": [], "dt": [],
  //               "hdg": [], "CNTROT": [], "CNTSPD": [], "latitude": [], "longitude": [] }
  // }
}

const resetAisDisplayData = () => {
  // if (ver === '5') {
    aisDisplay.value = { "sog": [], "foc": [], "dt": [] }
  // } else if (ver === '10') {
  //   aisDisplayOld.value = { "sog": [], "foc": [], "dt": [] }
  // }
}

const resetAisCalcData = () => {
  // if (ver === '5') {
    aisCalc.value = { "sog": [], "foc": [], "load_condition": [], "cf": [], "dt": [],
                    "hdg": [], "cntrot": [], "cntspd": [], "perfSpd": [], "date":[] }
  // } else if (ver === '10') {
  //   aisCalcOld.value = { "sog": [], "foc": [], "load_condition": [], "cf": [], "dt": [],
  //                   "hdg": [], "cntrot": [], "cntspd": [], "perfSpd": [], "date":[] }
  // }
}

const resetAisMapData = () => {
  aisMap.value = { "sog": [], "foc": [], "dt": [], "latitude": [], "longitude": [] }
}

const setFilter = () => {
  const goodFlag = { ais: { beaufort: [], HTSGW: [], is_forward_CNT: [], sog: [], date: [] } }

  const filterArray = [beaufort, sigwave, advCurrent, deparr, spdLimit]
  const dataArray = [aisImoData]
  const dataString = ["ais"]
  const startTime = new Date(deparr.min).getTime()
  const endTime = new Date(deparr.max).getTime()
  for (const idx in filterArray) {
    const obj = filterArray[idx]
    for (const idx2 in dataArray) {
      const data = dataArray[idx2]
      const dataName = dataString[idx2]
      data[obj.colName].forEach((val,idx3) => {
        if (obj.filterType === "between") {
          if (val >= obj.min && val <= obj.max) {
            goodFlag[dataName][obj.colName].push(idx3)
          }
        } else if (obj.filterType === "GE") {
          if (val >= obj.val) {
            goodFlag[dataName][obj.colName].push(idx3)
          }
        } else if (obj.filterType === "GT") {
          if (val > obj.val) {
            goodFlag[dataName][obj.colName].push(idx3)
          }
        } else if (obj.filterType === "equal") {
          if (obj.val !== -1) {
            if (val === obj.val  || obj.ext.includes(val)) {
              goodFlag[dataName][obj.colName].push(idx3)
            }
          } else {
            goodFlag[dataName][obj.colName].push(idx3)
          }
        } else if (obj.filterType === "dateWithin") {
          const dataTime = new Date(val).getTime()
          if (dataTime >= startTime && dataTime <= endTime) {
            goodFlag[dataName][obj.colName].push(idx3)
          }
        }
      })
    }
  }


  let finalGoodFlag = {}
  finalGoodFlag.ais = goodFlag.ais.beaufort
  console.log(finalGoodFlag.ais)
  for (let i = 0; i < filterArray.length; i++) {
    const name = filterArray[i].colName
    for (const idx in dataArray) {
      const dataName = dataString[idx]
      finalGoodFlag[dataName] = finalGoodFlag[dataName].filter(value => goodFlag[dataName][name].includes(value))
    }
  }

  resetAisDisplayData()
  resetAisMapData()
  resetAisCalcData()
  finalGoodFlag.ais.forEach((idx) => {
    aisDisplay.value.sog.push(aisImoData.sog[idx])
    aisDisplay.value.foc.push(aisImoData.foc[idx])
    aisDisplay.value.dt.push(aisImoData.dt[idx])
    aisCalc.value.sog.push(aisImoData.sog[idx])
    aisCalc.value.foc.push(aisImoData.foc[idx])
    aisCalc.value.load_condition.push(aisImoData.load_condition[idx])
    aisCalc.value.dt.push(aisImoData.dt[idx])
    aisCalc.value.hdg.push(aisImoData.hdg[idx])
    aisCalc.value.cntrot.push(aisImoData.CNTROT[idx])
    aisCalc.value.cntspd.push(aisImoData.CNTSPD[idx])
    aisCalc.value.date.push(aisImoData.date[idx])
    // // map
    // aisMap.value.sog.push(aisImoData.sog[idx])
    // aisMap.value.foc.push(aisImoData.foc[idx])
    // aisMap.value.dt.push(aisImoData.dt[idx])
    // aisMap.value.latitude.push(aisImoData.latitude[idx])
    // aisMap.value.longitude.push(aisImoData.longitude[idx])
  })
  goodFlag.ais.date.forEach((idx) => {
    aisMap.value.sog.push(aisImoData.sog[idx])
    aisMap.value.foc.push(aisImoData.foc[idx])
    aisMap.value.dt.push(aisImoData.dt[idx])
    aisMap.value.latitude.push(aisImoData.latitude[idx])
    aisMap.value.longitude.push(aisImoData.longitude[idx])
  })
  updateAisCalc()
  updatePlot()
}

// const setFilterOld = () => {
//   const goodFlag = { ais: { beaufort: [], HTSGW: [], is_forward_CNT: [], sog: [], date: [] } }

//   const filterArray = [beaufort, sigwave, advCurrent, deparr, spdLimit]
//   const dataArray = [aisImoDataOld]
//   const dataString = ["ais"]
//   const startTime = new Date(deparr.min).getTime()
//   const endTime = new Date(deparr.max).getTime()
//   for (const idx in filterArray) {
//     const obj = filterArray[idx]
//     for (const idx2 in dataArray) {
//       const data = dataArray[idx2]
//       const dataName = dataString[idx2]
//       data[obj.colName].forEach((val,idx3) => {

//         if (obj.filterType === "between") {
//           if (val >= obj.min && val <= obj.max) {
//             goodFlag[dataName][obj.colName].push(idx3)
//           }
//         } else if (obj.filterType === "equal") {
//           if (obj.val !== -1) {
//             if (val === obj.val) {
//               goodFlag[dataName][obj.colName].push(idx3)
//             }
//           } else {
//             goodFlag[dataName][obj.colName].push(idx3)
//           }
//         } else if (obj.filterType === "dateWithin") {
//           const dataTime = new Date(val).getTime()
//           if (dataTime >= startTime && dataTime <= endTime) {
//             goodFlag[dataName][obj.colName].push(idx3)
//           }
//         }
//       })
//     }
//   }

//   let finalGoodFlag = {}
//   finalGoodFlag.ais = goodFlag.ais.beaufort
//   for (let i = 1; i < filterArray.length; i++) {
//     const name = filterArray[i].colName
//     for (const idx in dataArray) {
//       const dataName = dataString[idx]
//       finalGoodFlag[dataName] = finalGoodFlag[dataName].filter(value => goodFlag[dataName][name].includes(value))
//     }
//   }

//   resetAisDisplayData()
//   resetAisCalcData()
//   finalGoodFlag.ais.forEach((idx) => {
//     aisDisplayOld.value.sog.push(aisImoDataOld.sog[idx])
//     aisDisplayOld.value.foc.push(aisImoDataOld.foc[idx])
//     // aisDisplayOld.value.dt.push(aisImoDataOld.dt[idx])
//     aisCalcOld.value.sog.push(aisImoDataOld.sog[idx])
//     aisCalcOld.value.foc.push(aisImoDataOld.foc[idx])
//     aisCalcOld.value.load_condition.push(aisImoDataOld.load_condition[idx])
//     // aisCalcOld.value.dt.push(aisImoDataOld.dt[idx])
//     // aisCalcOld.value.hdg.push(aisImoDataOld.hdg[idx])
//     // aisCalcOld.value.cntrot.push(aisImoDataOld.CNTROT[idx])
//     // aisCalcOld.value.cntspd.push(aisImoDataOld.CNTSPD[idx])
//     aisCalcOld.value.date.push(aisImoDataOld.date[idx])
//   })
//   updateAisCalc()
//   updatePlot()
// }

const updateAisCalc = () => {
  aisCalc.value.cf = []
  aisCalc.value.dt.forEach((val, idx) => {
    // console.log(idx,val)
    const sog = aisCalc.value.sog[idx]
    const hdg = aisCalc.value.hdg[idx]
    const cntrot = aisCalc.value.cntrot[idx]
    const cntspd = aisCalc.value.cntspd[idx]
    const cf = cntspd * Math.cos((hdg - cntrot) * Math.PI / 180)
    const perfSpd = sog - cf
    aisCalc.value.cf.push(cf)
    aisCalc.value.perfSpd.push(perfSpd)
  })
  aisAveSpd.value = calcWeightedMean(getValidPeriodWeightValue(aisCalc.value.sog))
  // console.log(aisCalc.value.sog.reduce((a, b) => a + b, 0) / aisCalc.value.sog.length)
  aisCF.value = calcWeightedMean(getValidPeriodWeightValue(aisCalc.value.cf))
  aisPerfSpd.value = aisAveSpd.value - aisCF.value
  aisFOC.value = calcWeightedMean(getValidPeriodWeightValue(aisCalc.value.foc))
  aisLB.value = getLoadingString(aisCalc.value.load_condition)
  aisFOCRatio.value = calcRatio(aisFOC.value-varFOC.value, varFOC.value)
  aisSpdDiff.value = calcDiff(aisAveSpd.value, varAveSpd.value)
  aisPerfSpdDiff.value = calcDiff(aisPerfSpd.value, varPerfSpd.value)

  // aisOldAveSpd.value = aisCalcOld.value.sog.reduce((a, b) => a + b, 0) / aisCalcOld.value.sog.length
  // aisOldCF.value = '--'
  // aisOldPerfSpd.value = '--'
  // aisOldFOC.value = aisCalcOld.value.foc.reduce((a, b) => a + b, 0) / aisCalcOld.value.foc.length
  // aisOldLB.value = '--'
  // aisOldFOCRatio.value = calcRatio(aisOldFOC.value-varFOC.value, varFOC.value)
  // aisOldSpdDiff.value = calcDiff(aisOldAveSpd.value, varAveSpd.value)
  // aisCalc.value.sog.forEach((val, idx) => {
  //   console.log(aisCalc.value.date[idx])
  //   console.log(aisCalc.value.cntrot[idx], aisCalc.value.hdg[idx])
  //   console.log(aisCalc.value.cntspd[idx], aisCalc.value.cf[idx])
  // })
}

const calcWeightedMean = (arr) => {
  const sum = arr.reduce((a, b) => a + b, 0)
  const dtSum = aisCalc.value.dt.reduce((a, b) => a + b, 0)
  return sum / dtSum
}

const getValidPeriodWeightValue = (arr) => {
  const weightedValue = arr.map((val, idx) => {
      return val * aisCalc.value.dt[idx]
  })
  return weightedValue
}

const getLoadingString = (arr) => {
  let laden = 0
  let ballast = 0
  arr.forEach((val, idx) => {
    if (val === "B") {
      ballast += 1
    } else if (val === "L") {
      laden += 1
    } else {
      console.log('Else!')
    }
  })
  const description = (laden >= ballast) ? "L (" + (100 * laden / arr.length).toString() + "%)" 
                                        : "B (" + (100 * ballast / arr.length).toString() + "%)" 
  return description
}

const calcRatio = (a,b) => {
  return "(" + ((a / b) * 100).toFixed(2) + "%)"
}

const calcDiff = (a,b) => {
  const sign = (a - b) > 0 ? "+" : ""
  return "(" + sign + (a - b).toFixed(2) + ")"
}

const updatePlot = () => {
  curveReady.value = true
  display()
}

const getData = async () => {

  // read imo:shipname mapping json file
  const result = await fetch(`${DATA_STORAGE_URL}/imo_ship2.json`, {
    method: "GET",
    mode: "cors"
  })
  .then((res) => res.json())
  .then((res) => {
    res.forEach((item, idx) => {
      // console.log(item)
      imoList.value.push(item.imo_num)
      shipList.value.push(item.ship_name)
      dwtList.value.push(item.dwt)
      gtList.value.push(item.gt)
      if (item.ship_type === "Tanker" || item.ship_type === "Bulker") {
        shipTypeList.value.push(item.ship_type_dwt)
      } else {
        shipTypeList.value.push(item.ship_type)
      }
    })
  })
}

const getWaveHeight = (wave) => {
  if (wave.includes('DSS')) {
    return getSigWaveFromDSS(parseInt(wave.split('DSS')[1].trim()))
  } else if (wave.includes('All')) {
    return 100
  } else {
    return parseSigWave(wave)
  }
}

const getSigWaveFromDSS = (DSS) => {
  // return sigwave height from Douglas Sea State
  // https://docs.google.com/document/d/1iGk9d7II9ynxeyL7sJ1pIHk1dGaPlAM4/edit#
  // Average Wave Height x 1.6 = Significant Wave Height
  const sigWaveArray = [0, 0.1, 0.5, 1.25, 2.5, 4, 6, 9, 14]
  return sigWaveArray[DSS] * 1.6
}

const parseSigWave = (sigwave) => {
  return parseFloat(sigwave.match(/\d+/g).join('.'))
}

const display = () => {
  plotScatter()
  plotMap()
}

const plotScatter = () => {
  // display AIS scatter
  const traceAis = {
    x: [...aisDisplay.value.sog],
    y: [...aisDisplay.value.foc],
    text: [...aisDisplay.value.dt],
    hovertemplate: 'SOG: %{x:.2f}kt<br>FOC: %{y:.2f}mt/day<br>Duration: %{text:.2f}h',
    mode: 'markers',
    type: 'scatter',
    name: '3kt',
    // marker: { 
    //   color: [...aisDisplay.value.dt],
    //   cmin: 0,
    //   cmax: 5,
    //   colorscale: 'Portland',
    //   colobar: {
    //     dtick: 10
    //   }
    // }
    marker: { 
      color: 'blue'
    }
  }

  const traceAisOld = {
    x: [...aisDisplayOld.value.sog],
    y: [...aisDisplayOld.value.foc],
    mode: 'markers',
    type: 'scatter',
    name: '10kt',
    // marker: { 
    //   color: [...aisDisplay.value.dt],
    //   cmin: 0,
    //   cmax: 5,
    //   colorscale: 'Portland',
    //   colobar: {
    //     dtick: 10
    //   }
    // }
    marker: { 
      color: 'red'
    }
  }

  // layout
  const layout = {
    xaxis: {
      range: [0, 20]
    },
    yaxis: {
      range: [0, 50]
    },
    title: "AIS-based FOC Curve",
    paper_bgcolor: '#eee'
  }
  const plotData = [traceAis]
  Plotly.newPlot('plotly', plotData, layout)
}

const plotMap = () => {
  // display AIS scatter
  const traceMap = {
    lat: [...aisMap.value.latitude],
    lon: [...aisMap.value.longitude],
    text: [...aisMap.value.foc],
    hovertemplate: 'Pos: (%{lon:.3f}, %{lat:.3f})<br>FOC: %{text:.2f}mt/day',
    mode: 'markers',
    type: 'scattergeo',
    marker: { 
      width: 2,
      cmin: 0,
      cmax: 20,
      color: [...aisMap.value.sog],
      colorscale: 'Portland',
      colobar: {
        dtick: 10
      }
    }
  }

  // use the map method to make the negative values positive
  const newlon = aisMap.value.longitude.map((val, idx) => {
    // console.log(val,idx)
    if (val < 0) {
      return val + 360
    } else {
      return val
    }
  })

  const latMax = Math.max(...aisMap.value.latitude)
  const latMin = Math.min(...aisMap.value.latitude)
  const lonMax = Math.max(...newlon)
  const lonMin = Math.min(...newlon)
  const latCenter = ( latMax + latMin ) / 2
  const lonCenter = ( lonMax + lonMin ) / 2
  const dLat = ( latMax - latMin )
  const dLon = ( lonMax - lonMin )
  let dLat2, dLon2
  if (dLat >= dLon * 450 / 700) {
    dLat2 = dLat * 0.55
    dLon2 = dLat * 0.55* 700 / 450
  } else {
    dLat2 = dLon * 0.55* 450 / 700
    dLon2 = dLon * 0.55
  }

  // layout
  const layout = {
    title: {
      text: 'Route',
      yref: 'paper',
      y: 0.05
    },
    showlegend: false,
    paper_bgcolor: '#eee',
    geo: {
      resolution: 50,
      showland: true,
      showlakes: true,
      landcolor: 'rgb(204, 204, 204)',
      countrycolor: 'rgb(204, 204, 204)',
      lakecolor: 'rgb(255, 255, 255)',
      projection: {
        type: 'equirectangular'
      },
      coastlinewidth: 2,
      lataxis: {
        range: [ latCenter - dLat2, latCenter + dLat2 ],
        showgrid: false,
        tickmode: 'linear',
        dtick: 10
      },
      lonaxis:{
        range: [ lonCenter - dLon2, lonCenter + dLon2 ],
        // range: [ -20, -50 ]
        showgrid: false,
        tickmode: 'linear',
        dtick: 20
      }
    },
    margin: {
      l: 10,
      r: 10,
      b: 10,
      t: 10,
      pad: 0
    }
  }
  const plotData = [traceMap]
  Plotly.newPlot('plotlymap', plotData, layout)
}
</script>

<style scoped>
.about {
  width: 100vh;
  min-height: 100vh;
  display: inline-block;
  align-items: center;
}

.head {
  padding-top: 5%;
  font-size: 24px;
  font-weight: 700;
}

.category {
  padding-top: 20px;
  font-size: 21px;
  font-weight: 600;
  display: block;
}

.itemcol {
  font-size: 18px;
  font-weight: 500;
  display: inline;
}

#plotly, #plotlymap {
  width: 700px;
  height: 450px;
}

img {
  max-width: 150px;
  height: auto;
}

.active {
  background-color: hsla(160, 100%, 37%, 1);
}

button {
  width: 60px;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid #a5a5a5;
  border-radius: 8px;
  padding: 5px;
  margin-top: 4px;
}

table, th, td {
  border: 1px solid black;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  text-align: left;
}

th {
    font-weight: bold;
}

button:hover {
  border: 2px solid #000000;
}

.filter {
  font: 1rem 'Fira Sans', sans-serif;
  display: inline-block;
  left: 75%
}

.filter label {
  margin: 0px;
}

input:hover {
  border: 2px solid #000000;
}

.leglist {
  font-size: 12px;
  width: 250px;
}

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
