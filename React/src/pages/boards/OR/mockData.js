// 手術室 Mock Data ── 7 間
// Status: "in-surgery" | "prep" | "completed" | "empty"
const MOCK_DATA = {
  HospitalInfo: { HospitalName:"高雄市立民生醫院", WardName:"手術室", WardCode:"OR", WardDirector:"林○泰醫師", HeadNurse:"陳○雅護理長" },
  Rooms: [
    { RoomId:"OR-01", Status:"in-surgery", Patient:{ PatientName:"王○明", Gender:"M", Age:65, MedRecord:"A201234601", BirthDate:"1961/02/15", Department:"一般外科", Diagnosis:"Cholelithiasis, Acute cholecystitis", SurgeryName:"腹腔鏡膽囊切除術 LC", Doctor:"黃○誠醫師", ScrubNurse:"張○惠護理師", CircNurse:"李○婷護理師", AnesType:"全身麻醉 (GA)", SurgerySource:"住院刀", SurgeryStatus:"手術中", ScheduledTime:"08:30", StartTime:"09:05", EndTime:null, Notes:"有高血壓病史，術前停用 Aspirin 7 天，血壓控制良好" } },
    { RoomId:"OR-02", Status:"in-surgery", Patient:{ PatientName:"陳○芳", Gender:"F", Age:42, MedRecord:"B301234602", BirthDate:"1984/07/23", Department:"婦產科", Diagnosis:"Uterine myoma, Menorrhagia", SurgeryName:"子宮鏡肌瘤切除術 Hysteroscopic Myomectomy", Doctor:"林○泰醫師", ScrubNurse:"周○娟護理師", CircNurse:"王○珊護理師", AnesType:"脊椎麻醉 (SA)", SurgerySource:"門診刀", SurgeryStatus:"手術中", ScheduledTime:"09:00", StartTime:"09:32", EndTime:null, Notes:"術前子宮鏡評估完成" } },
    { RoomId:"OR-03", Status:"in-surgery", Patient:{ PatientName:"張○強", Gender:"M", Age:34, MedRecord:"C401234603", BirthDate:"1992/04/08", Department:"骨科", Diagnosis:"Right femur fracture, Displaced, MVA", SurgeryName:"右股骨骨折切開復位髓內釘固定術 ORIF", Doctor:"王○哲醫師", ScrubNurse:"張○惠護理師", CircNurse:"李○婷護理師", AnesType:"全身麻醉 (GA)", SurgerySource:"急診刀", SurgeryStatus:"手術中", ScheduledTime:"07:00", StartTime:"07:48", EndTime:null, Notes:"車禍傷患，術前血液備妥 2 單位" } },
    { RoomId:"OR-05", Status:"prep",       Patient:{ PatientName:"吳○秀", Gender:"F", Age:58, MedRecord:"D501234604", BirthDate:"1968/09/30", Department:"心臟外科", Diagnosis:"Mitral valve regurgitation, Severe (MR grade IV)", SurgeryName:"二尖瓣置換術 MVR", Doctor:"黃○誠醫師", ScrubNurse:"周○娟護理師", CircNurse:"張○惠護理師", AnesType:"全身麻醉 (GA) + 體外循環", SurgerySource:"住院刀", SurgeryStatus:"準備中", ScheduledTime:"11:30", StartTime:null, EndTime:null, Notes:"ICU 床位已預留，預計術程 4～5 小時" } },
    { RoomId:"OR-06", Status:"in-surgery", Patient:{ PatientName:"劉○明", Gender:"M", Age:72, MedRecord:"E601234605", BirthDate:"1954/01/11", Department:"泌尿外科", Diagnosis:"BPH with LUTS, IPSS 28, Qmax 5.2 mL/s", SurgeryName:"經尿道前列腺刮除術 TURP", Doctor:"陳○科醫師", ScrubNurse:"李○婷護理師", CircNurse:"周○娟護理師", AnesType:"脊椎麻醉 (SA)", SurgerySource:"住院刀", SurgeryStatus:"手術中", ScheduledTime:"10:00", StartTime:"10:28", EndTime:null, Notes:"術前停用 Warfarin" } },
    { RoomId:"OR-07", Status:"completed",  Patient:{ PatientName:"林○雯", Gender:"F", Age:29, MedRecord:"F701234606", BirthDate:"1997/05/16", Department:"整形外科", Diagnosis:"Hypertrophic scar contracture, Left hand dorsum", SurgeryName:"左手攣縮疤痕鬆解植皮術", Doctor:"林○泰醫師", ScrubNurse:"王○珊護理師", CircNurse:"李○婷護理師", AnesType:"局部麻醉 (LA)", SurgerySource:"門診刀", SurgeryStatus:"已完成", ScheduledTime:"08:00", StartTime:"08:22", EndTime:"10:18", Notes:"手術順利完成，病人已轉至恢復室" } },
    { RoomId:"OR-08", Status:"in-surgery", Patient:{ PatientName:"許○宏", Gender:"M", Age:48, MedRecord:"G801234607", BirthDate:"1978/12/03", Department:"一般外科", Diagnosis:"Acute appendicitis, Perforated, Peritonitis", SurgeryName:"腹腔鏡闌尾切除術 Lap. Appendectomy", Doctor:"王○哲醫師", ScrubNurse:"張○惠護理師", CircNurse:"周○娟護理師", AnesType:"全身麻醉 (GA)", SurgerySource:"急診刀", SurgeryStatus:"手術中", ScheduledTime:"06:30", StartTime:"07:15", EndTime:null, Notes:"急診穿孔性闌尾炎合併腹膜炎" } },
  ]
}

export function getStats(rooms) {
  const occupied = rooms.filter(r => r.Status !== 'empty')
  return {
    total:     rooms.length,
    inSurgery: rooms.filter(r => r.Status === 'in-surgery').length,
    prep:      rooms.filter(r => r.Status === 'prep').length,
    completed: rooms.filter(r => r.Status === 'completed').length,
    empty:     rooms.filter(r => r.Status === 'empty').length,
    erKnife:   occupied.filter(r => r.Patient?.SurgerySource === '急診刀').length,
    opKnife:   occupied.filter(r => r.Patient?.SurgerySource === '門診刀').length,
    inpKnife:  occupied.filter(r => r.Patient?.SurgerySource === '住院刀').length,
  }
}

export default MOCK_DATA
