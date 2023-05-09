<template>
    <div class="table">
        <div class="title">AIS Average</div>
        <EasyDataTable
            :headers="headers"
            :items="aisItems"
        />
    </div>
    <div class="table">
        <div class="title">Charter Party</div>
        <EasyDataTable
            :headers="headers"
            :items="cpItems"
        />
    </div>
    <div class="table">
        <div class="title">CII Ranking</div>
        <EasyDataTable
            :headers="headers"
            :items="ciiItems"
        />
    </div>
</template>

<script setup>
import { ref, defineProps, watch, onMounted } from 'vue'
import EasyDataTable from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'

// Props
const props = defineProps({
  tableData: { type: Object, default: () => {} }
})
// const { tableData } = toRefs(props)

// Create Table
const headers = ref([
    { text: "Speed", value: "sog", sortable: true },
    { text: "FOC", value: "foc", sortable: true },
    { text: "Loading condition", value: "load_condition", sortable: true }
])
const aisItems = ref([])
const cpItems = ref([])
const ciiItems = ref([])

watch(props, (newVal, oldVal) => {
    // console.log('props changed')
    // console.log(props.tableData)
    genTable(props.tableData)
})

const genTable = (obj) => {
    // AIS
    const aisItem = getAveFoc(obj.ais)
    aisItem["L"].sog.map((item, index) => {
         aisItems.value.push({
            sog: item,
            foc: aisItem["L"].foc[index],
            load_condition: 'L'
        })
    })
    aisItem["B"].sog.map((item, index) => {
         aisItems.value.push({
            sog: item,
            foc: aisItem["B"].foc[index],
            load_condition: 'B'
        })
    })
    // CP
    const cpItem = getAveFoc(obj.cp)
    cpItem["L"].sog.map((item, index) => {
         cpItems.value.push({
            sog: item,
            foc: cpItem["L"].foc[index],
            load_condition: 'L'
        })
    })
    cpItem["B"].sog.map((item, index) => {
         cpItems.value.push({
            sog: item,
            foc: cpItem["B"].foc[index],
            load_condition: 'B'
        })
    })
}

const getAveFoc = (data) => {
    const loadArray = ["L", "B"]
    const output = { L: {sog:[], foc:[]}, B: {sog:[], foc:[]} }
    const uniqueSpd = getUniqueSpeed(data.sog)
    uniqueSpd.forEach((spd) => {
        if (spd > 10) {
            loadArray.forEach(lb => {
                const foc = data.foc.filter((item, index) => data.sog[index].toFixed(1) === spd && data.load_condition[index] === lb)
                if (foc.length > 0) {
                    const focSum = foc.reduce((a, b) => a + b, 0)
                    const focAve = focSum / foc.length
                    output[lb].sog.push(spd)
                    output[lb].foc.push(focAve.toFixed(2))
                }
            })
        }
    })
    return output
}

const getUniqueSpeed = (arr) => {
    return [...new Set(arr.map(item => item.toFixed(1)))]
}

</script>

<style scoped>
.table {
    padding: 5px;
}

.title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 10px;
}
</style>