// 抗生素 Mock 資料（per-bed 格式）4F=11筆, 3F=5筆
// TODO 正式上線：return fetch(`/api/wards/ICU/antibiotics`).then(r => r.json())
const ANTIBIOTIC_DATA = {
  success: true, message: "",
  data: {
    wardCode: "ICU", queryDate: "2026-06-03",
    beds: [
      { id:"F4-01", antibiotics:[
          { antibioticId:1,  drugName:"Vancomycin 1g",                startDateTime:"2026-06-01 08:00", firstDoseDateTime:"2026-06-01 08:30", endDateTime:"2026-06-08 08:00" },
          { antibioticId:2,  drugName:"Meropenem 1g",                  startDateTime:"2026-06-02 12:00", firstDoseDateTime:"2026-06-02 12:10", endDateTime:"2026-06-09 12:00" }
      ]},
      { id:"F4-02", antibiotics:[{ antibioticId:3,  drugName:"Cefazolin 2g",                  startDateTime:"2026-06-03 07:00", firstDoseDateTime:"2026-06-03 07:15", endDateTime:"2026-06-05 07:00" }]},
      { id:"F4-03", antibiotics:[] },
      { id:"F4-05", antibiotics:[{ antibioticId:4,  drugName:"Ceftriaxone 2g",                startDateTime:"2026-06-01 20:00", firstDoseDateTime:"2026-06-01 20:05", endDateTime:"2026-06-07 20:00" }]},
      { id:"F4-06", antibiotics:[] },
      { id:"F4-07", antibiotics:[
          { antibioticId:5,  drugName:"Vancomycin 1g",                startDateTime:"2026-05-30 10:00", firstDoseDateTime:"2026-05-30 10:20", endDateTime:"2026-06-10 10:00" },
          { antibioticId:6,  drugName:"Piperacillin/Tazobactam 4.5g", startDateTime:"2026-05-30 10:00", firstDoseDateTime:"2026-05-30 10:15", endDateTime:"2026-06-06 10:00" }
      ]},
      { id:"F4-08", antibiotics:[{ antibioticId:7,  drugName:"Imipenem 500mg",                startDateTime:"2026-06-02 08:00", firstDoseDateTime:"2026-06-02 08:10", endDateTime:"2026-06-09 08:00" }]},
      { id:"F4-09", antibiotics:[{ antibioticId:8,  drugName:"Cefazolin 2g",                  startDateTime:"2026-06-03 06:00", firstDoseDateTime:"2026-06-03 06:10", endDateTime:"2026-06-04 06:00" }]},
      { id:"F4-10", antibiotics:[] },
      { id:"F4-11", antibiotics:[{ antibioticId:9,  drugName:"Meropenem 1g",                  startDateTime:"2026-06-02 10:00", firstDoseDateTime:"2026-06-02 10:05", endDateTime:"2026-06-09 10:00" }]},
      { id:"F4-12", antibiotics:[] },
      { id:"F4-13", antibiotics:[] },
      { id:"F4-15", antibiotics:[{ antibioticId:10, drugName:"Vancomycin 1.5g",               startDateTime:"2026-06-02 08:00", firstDoseDateTime:"2026-06-02 08:20", endDateTime:"2026-06-09 08:00" }]},
      { id:"F4-16", antibiotics:[] }, { id:"F4-17", antibiotics:[] },
      { id:"F4-18", antibiotics:[{ antibioticId:11, drugName:"Cefotaxime 2g",                 startDateTime:"2026-06-02 16:00", firstDoseDateTime:"2026-06-02 16:05", endDateTime:"2026-06-09 16:00" }]},
      { id:"F4-19", antibiotics:[] }, { id:"F4-20", antibiotics:[] }, { id:"F4-21", antibiotics:[] }, { id:"F4-22", antibiotics:[] },
      { id:"F3-01", antibiotics:[
          { antibioticId:12, drugName:"Piperacillin/Tazobactam 4.5g", startDateTime:"2026-05-31 08:00", firstDoseDateTime:"2026-05-31 08:10", endDateTime:"2026-06-07 08:00" },
          { antibioticId:13, drugName:"Vancomycin 1g",                startDateTime:"2026-06-01 12:00", firstDoseDateTime:"2026-06-01 12:15", endDateTime:"2026-06-08 12:00" }
      ]},
      { id:"F3-02", antibiotics:[{ antibioticId:14, drugName:"Meropenem 2g",                  startDateTime:"2026-05-30 16:00", firstDoseDateTime:"2026-05-30 16:20", endDateTime:"2026-06-06 16:00" }]},
      { id:"F3-03", antibiotics:[{ antibioticId:15, drugName:"Ceftriaxone 2g",                startDateTime:"2026-06-02 08:00", firstDoseDateTime:"2026-06-02 08:05", endDateTime:"2026-06-09 08:00" }]},
      { id:"F3-04", antibiotics:[] },
      { id:"F3-05", antibiotics:[{ antibioticId:16, drugName:"Meropenem 1g",                  startDateTime:"2026-06-03 08:00", firstDoseDateTime:"2026-06-03 08:20", endDateTime:"2026-06-10 08:00" }]}
    ]
  }
}

export function getAbxByBedId(bedId) {
  const bed = ANTIBIOTIC_DATA.data.beds.find(b => b.id === bedId)
  return bed ? bed.antibiotics : []
}

export function getAbxStats() {
  const all = ANTIBIOTIC_DATA.data.beds
  const f4 = all.filter(b => b.id.startsWith('F4'))
  const f3 = all.filter(b => b.id.startsWith('F3'))
  const countAbx = arr => arr.reduce((s, b) => s + b.antibiotics.length, 0)
  const countBeds = arr => arr.filter(b => b.antibiotics.length > 0).length
  const countDrug = name => all.reduce((s, b) => s + b.antibiotics.filter(a => a.drugName.toLowerCase().includes(name.toLowerCase())).length, 0)
  const total4f = countAbx(f4), total3f = countAbx(f3)
  const vanc = countDrug('vancomycin'), mero = countDrug('meropenem'), pip = countDrug('piperacillin')
  return { total: total4f + total3f, f4: total4f, f3: total3f, beds: countBeds(all), vanc, mero, pip, other: Math.max(0, total4f + total3f - vanc - mero - pip) }
}

export default ANTIBIOTIC_DATA
