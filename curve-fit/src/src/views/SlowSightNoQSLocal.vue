<template>
  <div class="about">
    <div class="head">Reactive AIS Charter Party</div>
      <!--IMO-->
      <div class="itemcol">IMO number: </div>
      <input
        v-model="selectedImo"
        type="text"
        autocomplete="on"
        list="imolist"
      >
      <datalist id="imolist">
        <option
          v-for="imo in imoList"
          :key="imo"
          :value="imo"
        />
      </datalist>
      <br>
      <!--ShipName-->
      <div class="itemcol">Ship name: </div>
      <input
        v-model="selectedShip"
        type="text"
        autocomplete="on"
        list="shiplist"
      >
      <datalist id="shiplist">
        <option
          v-for="ship in shipList"
          :key="ship"
          :value="ship"
        />
      </datalist>
      <br>
      <div
        class="numinp"
        v-if="displayReady">
        <!--Beaufort-->
        <div class="itemcol">Beaufort scale: </div>
        <input
          v-model="beaufort.min"
          style="text-align:right"
          type="number"
          :min="0"
          :max="beaufort.max"
        > - 
        <input
          v-model="beaufort.max"
          style="text-align:right"
          type="number"
          :min="beaufort.min"
          :max="12"
        >
        <br>
        <!--SigWave-->
        <div class="itemcol">SIGWAVE: </div>
        <input
          v-model="sigwave.min"
          style="text-align:right"
          type="number"
          :min="0"
          :max="sigwave.max"
        > - 
        <input
          v-model="sigwave.max"
          style="text-align:right"
          type="number"
          :min="sigwave.min"
          :max="10"
        >
        <br>
        <!--L/B-->
        <div class="itemcol">Loading condition:</div>
        <button
          class="allLB active"
          @click="changeLB(-1)">All</button>
        <button
          class="laden"
          @click="changeLB('L')">Laden</button>
        <button
          class="ballast"
          @click="changeLB('B')">Ballast</button>
          <br>
        <!--Adv-->
        <div class="itemcol">Adverse current:</div>
        <button
          class="allCurrent active"
          @click="changeAdvCurrent(-1)">All</button>
        <button
          class="hasAdvCurrent"
          @click="changeAdvCurrent(1)">Yes</button>
        <button
          class="noAdvCurrent"
          @click="changeAdvCurrent(0)">No</button>
          <br>
        {{ getAdvCurrentDescription(advCurrent.val) }}
      </div>
      <div 
        v-show="(displayReady && !curveReady)">
        <img src="/public/preloader.gif">
      </div>
      <div 
        v-show="curveReady"
        id="plotly"></div>
  </div>
</template>

<script setup>
import { Alglib } from 'https://cdn.jsdelivr.net/gh/Pterodactylus/Alglib.js@master/Alglib-v1.1.0.js'
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"
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
const shipList = ref([])
let aisDisplay
let aisImoData

// reactive variables
const shipTrigger = ref(true)
const imoTrigger = ref(true)
const selectedShip = ref("")
const selectedImo = ref("")
const beaufort = reactive({min:0, max:12, colName: "beaufort", filterType: "between"})
const sigwave = reactive({min:0, max:10, colName: "HTSGW", filterType: "between"})
const advCurrent = reactive({val:-1, colName: "is_forward_CNT", filterType: "equal"})
const lb = reactive({val:-1, colName: "load_condition", filterType: "equal"})

// status
const displayReady = ref(false)
const curveReady = ref(false)

onMounted(async () => {

  // get data
  getData()

  // watch
  watch(selectedImo, async (newValue) => { 
    const isInList = imoList.value.includes(newValue)
    if (isInList) {
      if ((selectedImo.value || selectedShip.value) && imoTrigger.value) {
        const index = imoList.value.indexOf(newValue)
        shipTrigger.value = false
        selectedShip.value = shipList.value[index]
        await Promise.all([
          getAISData(newValue)
        ])
        .then(() => {
          displayReady.value = true
          updatePlot()
          shipTrigger.value = true
        })
      }
    } else {
      displayReady.value = false
      selectedShip.value = ""
    }  
  }, { immediate: true })

  watch(selectedShip, async (newValue) => { 
    const isInList = shipList.value.includes(newValue)
    if (isInList) {
      if ((selectedImo.value || selectedShip.value) && shipTrigger.value) {
        const index = shipList.value.indexOf(newValue)
        imoTrigger.value = false
        selectedImo.value = imoList.value[index]
        await Promise.all([
          getAISData(imoList.value[index])
        ])
        .then(() => {
          displayReady.value = true
          updatePlot()
          imoTrigger.value = true
        })
      }
    } else {
      displayReady.value = false
      selectedImo.value = ""
    }
  }, { immediate: true })

})

// watch
watch(beaufort, () => {
  setFilter()
})

watch(sigwave, () => {
  setFilter()
})

watch(advCurrent, () => {
  setFilter()
})

watch(lb, () => {
  setFilter()
})

// functions
const changeAdvCurrent = (newValue) => {
  advCurrent.val = newValue
  // css of buttons
  const allCurrent = document.getElementsByClassName("allCurrent")[0]
  const hasAdvCurrent = document.getElementsByClassName("hasAdvCurrent")[0]
  const noAdvCurrent = document.getElementsByClassName("noAdvCurrent")[0]
  if (newValue === 1) {
    allCurrent.classList.remove('active')
    hasAdvCurrent.classList.add('active')
    noAdvCurrent.classList.remove('active')
  } else if (newValue === 0) {
    allCurrent.classList.remove('active')
    hasAdvCurrent.classList.remove('active')
    noAdvCurrent.classList.add('active')
  } else if (newValue === -1) {
    allCurrent.classList.add('active')
    hasAdvCurrent.classList.remove('active')
    noAdvCurrent.classList.remove('active')
  }
}

const changeLB = (newValue) => {
  lb.val = newValue
  // css of buttons
  const allLB = document.getElementsByClassName("allLB")[0]
  const laden = document.getElementsByClassName("laden")[0]
  const ballast = document.getElementsByClassName("ballast")[0]
  if (newValue === 'L') {
    allLB.classList.remove('active')
    laden.classList.add('active')
    ballast.classList.remove('active')
  } else if (newValue === 'B') {
    allLB.classList.remove('active')
    laden.classList.remove('active')
    ballast.classList.add('active')
  } else if (newValue === -1) {
    allLB.classList.add('active')
    laden.classList.remove('active')
    ballast.classList.remove('active')
  }
}

const getAdvCurrentDescription = (advCurrent) => {
  if (advCurrent === 0) {
    return "Adverse current is not included."
  } else if (advCurrent === 1) {
    return "Adverse current is included."
  } else if (advCurrent === -1) {
    return "Current condition is not taken into consideration."
  }
}

const getAISData = async (imo) => {
  if (imo) {
    resetAisData()
    resetDisplayData()
    const result = await fetch(`${DATA_STORAGE_URL}/qs/${imo}.json`, {
      method: "GET",
      // headers: awsCredentialHeader,
      mode: "cors"
    })
    .then((res) => res.json())
    .then((res) => {
      res.forEach((item, idx) => {
        aisImoData.sog.push(item.sog)
        aisImoData.foc.push(item.focperday)
        aisImoData.beaufort.push(item.beaufort)
        aisImoData.HTSGW.push(item.HTSGW)
        aisImoData.is_forward_CNT.push(item.is_forward_CNT)
        aisImoData.SECA.push(item.SECA)
        aisImoData.load_condition.push(item.load_condition)
      })
      aisDisplay.sog = aisImoData.sog
      aisDisplay.foc = aisImoData.foc
    })
  }
}

const resetAisData = () => {
  aisImoData = {"sog": [], "foc": [], "SECA": [], "beaufort":[], "HTSGW": [],
                "is_forward_CNT": [], "load_condition": []}
}

const resetDisplayData = () => {
  aisDisplay = {"sog": [], "foc": []}
}

const setFilter = () => {
  const goodFlag = { beaufort: [], HTSGW: [], is_forward_CNT: [], load_condition: [] }

  const filterArray = [beaufort, sigwave, advCurrent, lb]
  for (const idx in filterArray) {
    const obj = filterArray[idx]
    aisImoData[obj.colName].forEach((val,idx) => {
      if (obj.filterType === "between") {
        if (val >= obj.min && val <= obj.max) {
          goodFlag[obj.colName].push(idx)
        }
      } else if (obj.filterType === "equal") {
        if (obj.val !== -1) {
          if (val === obj.val) {
            goodFlag[obj.colName].push(idx)
          }
        } else {
          goodFlag[obj.colName].push(idx)
        }
      }
    })
  }

  // aisImoData[obj.colName].forEach((val,idx) => {
  //   if (obj.filterType === "between") {
  //     if (val >= obj.min && val <= obj.max) {
  //       goodFlag.push(idx)
  //     }
  //   } else if (obj.filterType === "equal") {
  //     if (obj.val !== -1) {
  //       if (val === obj.val) {
  //         goodFlag.push(idx)
  //       }
  //     } else {
  //       goodFlag.push(idx)
  //     }
  //   }
  // })

  let finalGoodFlag = goodFlag.beaufort
  for (let i = 1; i < filterArray.length; i++) {
    const name = filterArray[i].colName
    finalGoodFlag = finalGoodFlag.filter(value => goodFlag[name].includes(value))
  }

  resetDisplayData()
  finalGoodFlag.forEach((idx) => {
    aisDisplay.sog.push(aisImoData.sog[idx])
    aisDisplay.foc.push(aisImoData.foc[idx])
  })
  updatePlot()
}

const updatePlot = () => {
  curveReady.value = false
  const curveData = calcRegression()
}

const getData = async () => {

  // read imo:shipname mapping json file
  const result = await fetch(`${DATA_STORAGE_URL}/imo_ship.json`, {
    method: "GET",
    // headers: awsCredentialHeader,
    mode: "cors"
  })
  .then((res) => res.json())
  .then((res) => {
    res.forEach((item, idx) => {
      imoList.value.push(item.imo_num)
      shipList.value.push(item.ship_name)
    })
  })
}

const calcRegression = () => {
  const curveData = { "cubic": [], "power": [], "coeffCubic": [], "coeffPower": [] }

  const sogData = aisDisplay.sog
  const focData = aisDisplay.foc

  const regData = []
  for (let i = 0; i < sogData.length; i++) {
    if (sogData[i] > 10) {
      regData.push([sogData[i], focData[i]])
    } 
  }

  // // regression.js
  // const result = regression.polynomial(regData, { order: 3 })
  // console.log(result)

  // // create polynomial function
  // const getRegressionValue = (x) => {
  //   const y = result.equation[0] * x ** 3 +
  //   result.equation[1] * x ** 2 +
  //   result.equation[2] * x ** 1 +
  //   result.equation[3]
  //   return y
  // }

  // // generate curve for displayRegression
  // for (let i = 0; i < 301; i++) {
  //   const xValue = i / 10
  //   curveData.cubic.push(getRegressionValue(xValue))
  // }
  // curveReady.value = true
  // console.log(curveData)
  // display(curveData)


  // alglib.js
  // Ref: https://stackoverflow.com/a/73942668
  const cubicFunc = (coeff, x) => {
    // y = ax^3 + b
    return coeff[0] * (x ** 3) + coeff[1]
  }
  const calcCubic = (coeff) => {
    let sum = 0
    for (let i = 0; i < regData.length; ++i) {
        sum = sum + Math.pow(regData[i][1] - cubicFunc(coeff, regData[i][0]), 2)
    }
    let sse = Math.sqrt(sum)
    return sse
  }

  const powerFunc = (coeff, x) => {
    // y = ax^b + c
    return coeff[0] * (x ** coeff[1]) + coeff[2]
  }
  const calcPower = (coeff) => {
    let sum = 0
    for (let i = 0; i < regData.length; ++i) {
        sum = sum + Math.pow(regData[i][1] - powerFunc(coeff, regData[i][0]), 2)
    }
    let sse = Math.sqrt(sum)
    return sse
  }

  let solver = new Alglib()
  // let solver2 = new Alglib()
  solver.add_function(calcCubic) // Add the first equation to the solver.
  solver.promise.then((result) => { 
    const x_guess = [10,10,10,10] // Guess the initial values of the solution.
    const s = solver.solve("min", x_guess) // Solve the equation
    let a = solver.get_results()
    for (let i = 0; i < 301; i++) {
      const xValue = i / 10
      curveData.cubic.push(cubicFunc(a, xValue))
    }
    curveData.coeffCubic.push(...a)
  })
  .then(() => {
    // solver2.add_function(calcPower) // Add the first equation to the solver.
    // solver2.promise.then((result) => { 
    //   const x_guess = [0.01,1,1,1] // Guess the initial values of the solution.
    //   const s = solver2.solve("min", x_guess) // Solve the equation
    //   let a = solver2.get_results()
    //   for (let i = 0; i < 301; i++) {
    //     const xValue = i / 10
    //     curveData.power.push(powerFunc(a, xValue))
    //   }
    //   curveData.coeffPower.push(...a)
    // })
    // .then(() => {
      curveReady.value = true
      display(curveData)
    // })
  })
}

const display = (data) => {
  // display AIS scatter
  const traceAis = {
    x: [...aisDisplay.sog],
    y: [...aisDisplay.foc],
    name: "AIS",
    mode: 'markers',
    type: 'scatter',
    marker: { color: 'blue' }
  }

  // display CP scatter
  // const traceCp = {
  //   x: [...cpData.sog[selectedImo.value]],
  //   y: [...cpData.foc[selectedImo.value]],
  //   name: "Charter Party",
  //   mode: 'markers',
  //   type: 'scatter',
  //   marker: { color: 'red' }
  // }

  // display regression line (cubic)
  const traceRegCub = {
    x: [...Array(301).keys()].map(x => x / 10),
    y: data.cubic,
    name: "cubic curve (y=ax^3+b)",
    type: 'scatter',
    marker: { color: 'rgb(255,197,0)' },
    line: { width: 6 }
  }

  // display regression line (power)
  const traceRegPow = {
    x: [...Array(301).keys()].map(x => x / 10),
    y: data.power,
    name: "arbitrary power (y=ax^b+c)",
    type: 'scatter',
    marker: { color: 'rgb(35,134,0)' },
    line: { width: 6 }
  }

  // layout
  const layout = {
    xaxis: {range: [0, 20]},
    yaxis: {range: [0, 50]}
  }
  const plotData = [traceAis, traceRegCub, traceRegPow]
  Plotly.newPlot('plotly', plotData, layout)
}
</script>

<style>
/* @media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: inline-block;
    align-items: center;
  }
} */

.about {
  width: 100vh;
  min-height: 100vh;
  display: inline-block;
  align-items: center;
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

#plotly {
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

button:hover {
  border: 2px solid #000000;
}

input {
  width: 150px;
  font-family: Arial;
  font-size: 12px;
  border: 2px solid #a5a5a5;
  border-radius: 8px;
  padding: 5px;
  margin-top: 4px;
}

.numinp input {
  width: 60px;
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
