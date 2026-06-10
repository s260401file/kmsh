// 急診室 Mock Data ── 19 床
// Status: "occupied" | "isolation" | "observation" | "awaiting" | "transfer" | "empty"
const MOCK_DATA = {
  HospitalInfo: { HospitalName:"高雄市立民生醫院", WardName:"急診室", WardCode:"ER", WardDirector:"黃○誠", HeadNurse:"吳○珊" },
  Beds: [
    { BedId:"負2",   Zone:"負壓隔離室", Status:"isolation",   Patient:{ PatientName:"陳○文", Gender:"M", Age:58, ArrivalDate:"05/24", ArrivalTime:"06:40", Diagnosis:"Pulmonary TB suspected, Hemoptysis", Doctor:"林○泰醫師", Nurse:"周○娟護理師", Department:"胸腔內科", MedRecord:"A201234567", BirthDate:"1968/03/12", Triage:2, Dnr:false, Isolation:"負壓隔離", Observation:false, Awaiting:true, AwaitingType:"隔離", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:false, Consult:true, Notes:"疑似肺結核，需感染科會診確認" } },
    { BedId:"負1",   Zone:"負壓隔離室", Status:"isolation",   Patient:{ PatientName:"劉○婷", Gender:"F", Age:44, ArrivalDate:"05/24", ArrivalTime:"09:15", Diagnosis:"COVID-19 suspected, Fever, Cough", Doctor:"陳○科醫師", Nurse:"李○婷護理師", Department:"感染科", MedRecord:"B301234568", BirthDate:"1982/07/28", Triage:3, Dnr:false, Isolation:"負壓隔離", Observation:true, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:false, Notes:"COVID-19 快篩陽性，PCR送驗中" } },
    { BedId:"MER01", Zone:"急救室",     Status:"occupied",    Patient:{ PatientName:"王○進", Gender:"M", Age:73, ArrivalDate:"05/24", ArrivalTime:"11:08", Diagnosis:"Cardiac arrest, ROSC achieved, Post-CPR care", Doctor:"黃○誠醫師", Nurse:"張○惠護理師", Department:"心臟內科", MedRecord:"C401234569", BirthDate:"1953/01/19", Triage:1, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"加護", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:true, Notes:"CPR 後恢復自主心跳，準備轉 CCU" } },
    { BedId:"MER02", Zone:"第一診療區", Status:"occupied",    Patient:{ PatientName:"蔡○明", Gender:"M", Age:35, ArrivalDate:"05/24", ArrivalTime:"09:55", Diagnosis:"Acute appendicitis R/O, Abd pain RLQ", Doctor:"王○哲醫師", Nurse:"李○婷護理師", Department:"一般外科", MedRecord:"D501234570", BirthDate:"1991/05/03", Triage:3, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"一般", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, Admitted:true, AdmBedNo:"W52-031", FallRisk:false, Allergy:false, Exam:true, Consult:true, Notes:"外科住院已申請，床號 W52-031" } },
    { BedId:"MER03", Zone:"第一診療區", Status:"occupied",    Patient:{ PatientName:"許○雯", Gender:"F", Age:28, ArrivalDate:"05/24", ArrivalTime:"10:30", Diagnosis:"Ankle fracture, R/O Malleolus #", Doctor:"林○泰醫師", Nurse:"周○娟護理師", Department:"骨科", MedRecord:"E601234571", BirthDate:"1998/09/11", Triage:4, Dnr:false, Isolation:"無", Observation:false, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:true, Exam:true, Consult:false, Notes:"骨科門診安排後續" } },
    { BedId:"MER05", Zone:"第一診療區", Status:"occupied",    Patient:{ PatientName:"張○義", Gender:"M", Age:68, ArrivalDate:"05/24", ArrivalTime:"08:22", Diagnosis:"Acute ischemic stroke, NIHSS 14", Doctor:"黃○誠醫師", Nurse:"張○惠護理師", Department:"神經內科", MedRecord:"F701234572", BirthDate:"1958/02/14", Triage:2, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"加護", TransferOut:false, TransferIn:true, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:true, Notes:"tPA 治療中，轉 ICU 申請中" } },
    { BedId:"MER06", Zone:"第一診療區", Status:"observation", Patient:{ PatientName:"林○淑", Gender:"F", Age:62, ArrivalDate:"05/24", ArrivalTime:"07:18", Diagnosis:"Chest pain, R/O ACS, Typical angina", Doctor:"陳○科醫師", Nurse:"李○婷護理師", Department:"心臟內科", MedRecord:"G801234573", BirthDate:"1964/11/30", Triage:3, Dnr:false, Isolation:"無", Observation:true, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:false, Notes:"Troponin 序列追蹤，心電圖監測中" } },
    { BedId:"MER07", Zone:"第一診療區", Status:"empty",       Patient:null },
    { BedId:"MER08", Zone:"第二診療區", Status:"occupied",    Patient:{ PatientName:"吳○偉", Gender:"M", Age:55, ArrivalDate:"05/24", ArrivalTime:"10:05", Diagnosis:"Bowel obstruction, Abd distension, N/V", Doctor:"王○哲醫師", Nurse:"周○娟護理師", Department:"一般外科", MedRecord:"H901234574", BirthDate:"1971/08/22", Triage:3, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"一般", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:true, Notes:"NG 置入，腹部 CT 完成" } },
    { BedId:"MER09", Zone:"第二診療區", Status:"observation", Patient:{ PatientName:"黃○珠", Gender:"F", Age:48, ArrivalDate:"05/24", ArrivalTime:"08:50", Diagnosis:"UTI, Pyelonephritis R/O, Fever 38.8°C", Doctor:"林○泰醫師", Nurse:"張○惠護理師", Department:"腎臟內科", MedRecord:"I001234575", BirthDate:"1978/04/06", Triage:4, Dnr:false, Isolation:"無", Observation:true, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:true, Exam:true, Consult:false, Notes:"靜脈抗生素治療中" } },
    { BedId:"MER10", Zone:"第二診療區", Status:"empty",       Patient:null },
    { BedId:"MER11", Zone:"第二診療區", Status:"observation", Patient:{ PatientName:"彭○霞", Gender:"F", Age:76, ArrivalDate:"05/24", ArrivalTime:"05:30", Diagnosis:"Drug overdose, Benzodiazepine ingestion", Doctor:"黃○誠醫師", Nurse:"張○惠護理師", Department:"精神科", MedRecord:"K201234577", BirthDate:"1950/06/18", Triage:3, Dnr:true, Isolation:"無", Observation:true, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:true, Allergy:false, Exam:false, Consult:true, Notes:"意識已恢復，精神科會診中" } },
    { BedId:"MER12", Zone:"第二診療區", Status:"awaiting",    Patient:{ PatientName:"謝○宏", Gender:"M", Age:52, ArrivalDate:"05/24", ArrivalTime:"07:55", Diagnosis:"DKA, Blood glucose 680mg/dL, pH 7.18", Doctor:"林○泰醫師", Nurse:"周○娟護理師", Department:"新陳代謝科", MedRecord:"L301234578", BirthDate:"1974/10/02", Triage:2, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"加護", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:true, Notes:"胰島素靜滴中，ICU 床位待確認" } },
    { BedId:"MER13", Zone:"第二診療區", Status:"occupied",    Patient:{ PatientName:"洪○成", Gender:"M", Age:22, ArrivalDate:"05/24", ArrivalTime:"11:40", Diagnosis:"Laceration wound, Right hand 2cm", Doctor:"陳○科醫師", Nurse:"李○婷護理師", Department:"急診外科", MedRecord:"J101234576", BirthDate:"2004/12/05", Triage:5, Dnr:false, Isolation:"無", Observation:false, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:false, Consult:false, Notes:"傷口清創縫合完成，衛教後離院" } },
    { BedId:"OER01", Zone:"第一留觀區", Status:"observation", Patient:{ PatientName:"楊○美", Gender:"F", Age:71, ArrivalDate:"05/24", ArrivalTime:"04:20", Diagnosis:"Dizziness, Vertigo, R/O BPPV vs Central", Doctor:"陳○科醫師", Nurse:"李○婷護理師", Department:"神經內科", MedRecord:"M401234579", BirthDate:"1955/03/25", Triage:4, Dnr:false, Isolation:"無", Observation:true, Awaiting:false, AwaitingType:null, TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:true, Allergy:false, Exam:true, Consult:false, Notes:"頭部 MRI 待安排，症狀已明顯改善" } },
    { BedId:"OER02", Zone:"第一留觀區", Status:"awaiting",    Patient:{ PatientName:"許○輝", Gender:"M", Age:80, ArrivalDate:"05/24", ArrivalTime:"03:10", Diagnosis:"Hip fracture, Left femoral neck # (displaced)", Doctor:"王○哲醫師", Nurse:"張○惠護理師", Department:"骨科", MedRecord:"N501234580", BirthDate:"1946/09/07", Triage:3, Dnr:false, Isolation:"無", Observation:true, Awaiting:true, AwaitingType:"一般", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:true, Allergy:false, Exam:true, Consult:true, Notes:"骨科手術安排中，NPO 指示" } },
    { BedId:"MER993", Zone:"待床區",   Status:"empty",       Patient:null },
    { BedId:"MER992", Zone:"待床區",   Status:"transfer",    Patient:{ PatientName:"周○強", Gender:"M", Age:39, ArrivalDate:"05/24", ArrivalTime:"09:00", Diagnosis:"Minor head injury, GCS 15, No ICH on CT", Doctor:"黃○誠醫師", Nurse:"周○娟護理師", Department:"神經外科", MedRecord:"O601234581", BirthDate:"1987/11/13", Triage:3, Dnr:false, Isolation:"無", Observation:false, Awaiting:false, AwaitingType:null, TransferOut:true, TransferIn:false, TransferHospital:"聖馬爾定醫院", Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:false, Notes:"安排轉至聖馬爾定醫院" } },
    { BedId:"MER991", Zone:"待床區",   Status:"awaiting",    Patient:{ PatientName:"鄭○成", Gender:"M", Age:67, ArrivalDate:"05/24", ArrivalTime:"06:00", Diagnosis:"COPD exacerbation, SpO2 88% on room air", Doctor:"陳○科醫師", Nurse:"李○婷護理師", Department:"胸腔內科", MedRecord:"P701234582", BirthDate:"1959/07/29", Triage:4, Dnr:false, Isolation:"無", Observation:false, Awaiting:true, AwaitingType:"一般", TransferOut:false, TransferIn:false, Aad:false, Mbd:false, FallRisk:false, Allergy:false, Exam:true, Consult:false, Notes:"一般病房待床中" } },
  ],

  // 三班醫護人員（示意資料；屆時改由 API 提供）
  ShiftStaff: [
    { Shift:"白班", Time:"07:00–15:00", Doctor:"張○哲醫師", ChargeNurse:"王○琳護理師", NurseCount:6 },
    { Shift:"小夜", Time:"15:00–23:00", Doctor:"林○泰醫師", ChargeNurse:"李○婷護理師", NurseCount:4 },
    { Shift:"大夜", Time:"23:00–07:00", Doctor:"黃○誠醫師", ChargeNurse:"陳○華護理師", NurseCount:3 }
  ]
}

export function getStats(beds) {
  const counted  = beds.filter(b => !b.NoCount)
  const occupied = counted.filter(b => b.Status !== 'empty')
  return {
    total:       counted.length,
    attending:   occupied.length,
    observation: occupied.filter(b => b.Patient?.Observation).length,
    transferIn:  occupied.filter(b => b.Patient?.TransferIn).length,
    transferOut: occupied.filter(b => b.Patient?.TransferOut).length,
    sevA:        occupied.filter(b => b.Patient?.Triage <= 2).length,
    sevB:        occupied.filter(b => b.Patient?.Triage === 3).length,
    sevC:        occupied.filter(b => b.Patient?.Triage >= 4).length,
    dnr:         occupied.filter(b => b.Patient?.Dnr).length,
    admitted:    occupied.filter(b => b.Patient?.Admitted).length,
    awaitGen:    occupied.filter(b => b.Patient?.Awaiting && b.Patient?.AwaitingType === '一般').length,
    awaitIcu:    occupied.filter(b => b.Patient?.Awaiting && b.Patient?.AwaitingType === '加護').length,
    awaitIso:    occupied.filter(b => b.Patient?.Awaiting && b.Patient?.AwaitingType === '隔離').length,
  }
}

export default MOCK_DATA
