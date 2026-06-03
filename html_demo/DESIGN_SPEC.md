# UI/UX 設計規範文檔
## 高雄民生醫院 ICU 電子白板系統

- **版本**：v1.2
- **文檔日期**：2026-05-22（v1.2 更新：2026-05-22）
- **設計師**：合匯科技 UI/UX Team
- **對應PRD**：PRD.md v1.2

---

## 1. 設計策略

### 1.1 設計風格
**醫療專業看板（Medical Dashboard）**
- 以「資訊可讀性」為第一優先，所有設計決策以 3 公尺距離、55 吋螢幕可清晰辨識為基準
- 色彩直接傳遞狀態資訊，無需文字輔助
- 無動畫效果，確保畫面穩定、不分散注意力

### 1.2 核心設計原則
1. **可讀性優先**：字體夠大、對比度夠高，3公尺遠可辨識所有文字
2. **狀態即色彩**：不同床位狀態對應不同顏色，一目了然
3. **低認知負擔**：資訊層級分明，排版清晰，避免視覺雜訊
4. **雙模式共用結構**：夜間版／明亮版共用同一套佈局與資訊架構

### 1.3 品牌色彩來源
參考高雄市立民生醫院官方網站，提取品牌色系：中綠色系主調、橙色點綴、乾淨白底

---

## 2. 色彩系統

### 2.1 🌙 夜間版（Dark Mode）

```
頁面背景：        #0D1B2A  — 深海軍藍，護眼底色
Header 背景：     #0A1520  — 更深的墨藍
Filter 背景：     #0F1E30
樓層標籤背景：    #1A2F45  — 同住院卡片（統計面板 ws-row 亦使用）
卡片背景（住院）：#1A2F45  — 深藍綠，主要床位
卡片背景（空床）：#151E28  — 深灰，空床弱化
主強調色：        #3BAF7A  — 民生綠
次強調色：        #F5B942  — 琥珀黃，待轉/待出院
危險色：          #E8736A  — 珊瑚紅，隔離/警示
標題文字：        #F0F4F8  — 亮白（--text-primary）
次要文字：        #A8B8CC  — 淺灰藍（--text-secondary）
淡化文字：        #5A7090  — 弱化說明文字（--text-muted）
空床文字：        #445A70
分隔線：          #1E3048
Floor 邊框：      #2A3D55
```

#### 床位狀態色彩對照（夜間版）
| 狀態 | 卡片背景 | 卡片左側邊框 | 文字 |
|------|---------|------------|------|
| 住院中（occupied） | `#1A2F45` | `#3BAF7A` 4px | `#F0F4F8` |
| 空床（empty） | `#151E28` | `#2A3D55` 2px 虛線 | `#445A70` |
| 隔離（isolation） | `#2D1A1A` | `#E8736A` 4px | `#F0F4F8` |
| 待轉（transfer） | `#2A2210` | `#F5B942` 4px | `#F0F4F8` |
| 待出院（discharge） | `#162210` | `#6DBF67` 4px | `#F0F4F8` |

---

### 2.2 ☀️ 明亮版（Light Mode）

```
頁面背景：        #F2F5F8  — 淺灰白，舒適底色
Header 背景：     #2D7A55  — 民生深綠
Filter 背景：     #E4EDF5
樓層標籤背景：    #DAEEE5  — 淺綠，統計面板 ws-row 使用 --bg-card-empty (#E8ECF0)
卡片背景（住院）：#FFFFFF  — 純白
卡片背景（空床）：#E8ECF0  — 淺灰
主強調色：        #2D7A55  — 民生深綠
次強調色：        #E8A020  — 橙琥珀，待轉/待出院
危險色：          #E05C5C  — 醫療紅，隔離/警示
標題文字：        #1A2635  — 深炭灰（--text-primary）
次要文字：        #3A5068  — 中深藍（--text-secondary）
淡化文字：        #7A8FA0（--text-muted）
```

#### 床位狀態色彩對照（明亮版）
| 狀態 | 卡片背景 | 卡片左側邊框 | 文字 |
|------|---------|------------|------|
| 住院中 | `#FFFFFF` | `#2D7A55` 4px | `#1A2635` |
| 空床 | `#E8ECF0` | `#B0BEC5` 2px 虛線 | `#90A4AE` |
| 隔離 | `#FFEBEB` | `#E05C5C` 4px | `#1A2635` |
| 待轉 | `#FFF8E1` | `#E8A020` 4px | `#1A2635` |
| 待出院 | `#E8F5E9` | `#4CAF50` 4px | `#1A2635` |

---

## 3. 字體系統

### 3.1 字體家族
```
主要字體（中文）：Microsoft JhengHei UI、Noto Sans TC、sans-serif
數字字體：       Roboto、Arial、sans-serif（數字等寬更易讀）
```

### 3.2 字體層級（依 55吋大螢幕3公尺視距設計）

```
頁首 ICU 大標：             42px / Black(900) / Roboto / 白色 + 綠光暈陰影
頁首姓名（主任/護理長）：   26px / Bold / --text-stats（白色系）
頁首標籤（主任/護理長）：   14px / Regular / --text-stats 75% opacity
即時時鐘（時間）：          30px / Bold / Roboto / --text-stats
即時時鐘（日期）：          16px / Regular / --text-stats 85% opacity
資料更新時間：              13px / Regular / --text-stats 75% opacity
跑馬燈公告：                20px / Regular
統計數字：                  46px / Black(900) / Roboto   ← 統計面板主數字
統計標籤：                  17px / Regular / opacity 0.80
床號：                      22px / Black(900) / Roboto / 行高1   ← 縮減至22px（原30px）
病患姓名：                  18px / Bold / 行高1                  ← 縮減至18px（原24px）
性別/年齡：                 13px / Regular / 行高1
Badge 標籤（卡片）：        13px / Bold
Badge 標籤（圖例列）：      15px / Bold / padding 6px 14px       ← 圖例列Badge較大
篩選列「全部」按鈕：        17px / SemiBold
主題切換按鈕：              16px / Regular
底部頁籤：                  24px / SemiBold
詳情Modal 床號：            22px / Black / accent-green
詳情Modal 姓名：            24px / Bold
詳情Modal 欄位標籤：        12px / Regular / --text-muted
詳情Modal 欄位值：          17px / SemiBold
```

---

## 4. 間距與佈局

```
基礎單位：          8px
頁面外邊距：        10px（看板型，邊距小，最大化顯示空間）
區塊間距：          10px
床卡間距：          10px（grid gap）
床卡內邊距：        8px 12px
床卡 flex gap：     6px
頁首高度：          72px（--header-h）
跑馬燈高度：        約 30px（padding 5px）
篩選列高度：        44px（--filter-h）
底部標籤列高度：    56px（--tabs-h）
```

### 4.1 整體佈局結構

```
┌─────────────────────────────────────────────────────────────┐
│  頁首列（72px）：ICU 標題 ｜ 病房主任 ｜ 護理長 ｜ 時間日期  │
├─────────────────────────────────────────────────────────────┤
│  跑馬燈（~30px）：院內公告跑馬燈                            │
├─────────────────────────────────────────────────────────────┤
│  圖例/過濾列（44px）：[全部] [R][D][接觸]...[氧] [夜間版]  │
├─────────────────────────────────────┬───────────────────────┤
│                                     │   3F 病區（5床）      │
│      4F 病區（20床，flex:4）        │──────────────────────│
│      依物理位置排列                 │   病況統計面板         │
│                                     │   ┌────────────────┐ │
│                                     │   │ 第一列：流量統計 │ │
│                                     │   │ 第二列：病況統計 │ │
│                                     │   └────────────────┘ │
├─────────────────────────────────────┴───────────────────────┤
│  底部標籤列（56px）：病房動態｜抗生素｜管路｜手術資訊｜...  │
└─────────────────────────────────────────────────────────────┘
```

> **設計決策**：統計面板從頂部獨立統計列移至右側 3F 病區下方，與病床配置圖同區，
> 避免頂部資訊過載，且統計數字與床位視覺距離更近，關聯性更強。

### 4.2 跑馬燈（公告列）

```
高度：         約 30px（padding 5px 16px）
字體：         20px / Regular
文字色：       --accent-yellow（夜間 #F5B942；明亮 #8B6000）
背景：         夜間 #1A1A0A；明亮 #FFF8E1
```

---

## 5. 核心組件規範

### 5.1 床位卡片（Bed Card）

```
尺寸：           全高自動（CSS Grid minmax(0,1fr) 均分可用高度）
                 4F：6列均分；3F：與 4F 等高（JS syncGridRowHeights() 同步）
圓角：           8px
左側狀態邊框：   4px solid（顏色依狀態）
空床虛線邊框：   2px dashed
陰影（明亮版）： 0 2px 8px rgba(0,0,0,0.10)
陰影（夜間版）： 0 2px 10px rgba(0,0,0,0.50)
hover：          translateY(-2px) + 加深陰影

卡片內部佈局（3 列）：
┌──────────────────────────────┐
│ 床號（22px Bold）            │  ← 第一行
│ 姓名（18px Bold，M藍/F粉）   │  ← 第二行（含性別/年齡 13px）
│ [Badge][Badge][Badge] [+N]   │  ← 第三行（margin-top:auto）
└──────────────────────────────┘
```

**空床卡片**：僅顯示床號 + 「空床」文字，置中排列，背景淡化，opacity 0.6，不可點擊

**性別顏色規範**：
```
夜間版  男性（M）：#64B5F6（淺藍）
夜間版  女性（F）：#F48FB1（淺粉）
明亮版  男性（M）：#1565C0（深藍）
明亮版  女性（F）：#AD1457（深玫瑰紅）
```

### 5.2 病患標記 Badge

#### 規格要求 13 種（依優先顯示順序）

```
Badge  意義              背景色    文字色
─────────────────────────────────────────
R      RRT 快速反應小組  #C62828   #fff
D      DNR 拒絕心肺復甦  #6A1B9A   #fff
接觸   接觸隔離          #B71C1C   #fff
飛沫   飛沫隔離          #AD1457   #fff
空氣   空氣隔離          #4A148C   #fff
跌     高危跌倒          #E65100   #fff
禁食   禁食（NPO）       #2E7D32   #fff
敏     藥物過敏          #BF360C   #fff
禁治   禁止治療          #0D47A1   #fff
保密   病人保密          #37474F   #fff
C      CRRT / 洗腎       #E65100   #fff
化療   化學治療          #880E4F   #fff
氧     氧氣設備          #01579B   #fff
```

#### 輔助標記 3 種（延伸規格，後接優先序）

```
椅     輪椅運送          #558B2F   #fff
推     推床運送          #4E342E   #fff
依賴   病人依賴度        #4527A0   #fff
```

#### 卡片顯示規則

```
卡片：    最多顯示前 3 個 Badge（依上方優先順序取用）
溢出：    第4個起顯示 "+N" 指示器（淡色半透明背景）
Modal：   顯示全部 Badge（無數量限制）
字體：    13px Bold
尺寸：    2px 8px padding × 4px 圓角（卡片）
          6px 14px padding × 4px 圓角（圖例列）
```

#### "+N" 指示器樣式

```
夜間版：  background rgba(255,255,255,0.18)  color --text-secondary
明亮版：  background rgba(0,0,0,0.10)        color --text-secondary
```

### 5.3 病況統計面板（Ward Stats）

#### 位置與結構

```
位置：    主畫面右下方，3F 床位區下方（grid row 3，flex: 1fr）
背景：    透明（統計面板本身透明，內部 ws-row 有背景色）
內距：    padding 4px 0 6px
```

#### ws-row 樣式

```
夜間版：  background #1A2F45（--bg-floor-label），border-radius 8px
明亮版：  background #E8ECF0（--bg-card-empty），border-radius 8px
分隔線：  相鄰 ws-item 間加 ::before 偽元素（夜間 rgba(255,255,255,0.12)，明亮 rgba(0,0,0,0.10)）
```

#### 第一列：流量統計

| 欄位 | 值顏色（夜間） | 值顏色（明亮） | 可點擊 |
|------|-------------|-------------|-------|
| 總床數 | #F0F4F8（白） | #1A2635（深） | ✗ |
| 住院 | #F0F4F8（白） | #1A2635（深） | ✗ |
| 手術 | #80D8FF（淺藍） | #1565C0（深藍） | ✓ data-filter="surgery" |
| 檢查 | #FFD54F（黃） | #E65100（深橘） | ✓ data-filter="exam" |
| 會診 | #FFAB40（橙） | #BF360C（深橘紅） | ✓ data-filter="consult" |

#### 第二列：病況統計

| 欄位 | 值顏色（夜間） | 值顏色（明亮） | data-filter | 聯動 |
|------|-------------|-------------|------------|------|
| 穩定 | #69DB7C（綠） | #2E7D32（深綠） | cond-a | — |
| 重症 | #F5B942（琥珀） | #C68000（深琥珀） | cond-b | — |
| 危急 | #FF6B6B（紅） | #C62828（深紅） | cond-c | — |
| 隔離 | #FF8A80（淺紅） | #AD1457（深玫紅） | iso | — |
| DNR | #FFD54F（黃） | #6A1B9A（深紫） | D | 與圖例列 D Badge 按鈕聯動 |
| RRT | #FF5252（鮮紅） | #B71C1C（深紅） | R | 與圖例列 R Badge 按鈕聯動 |

#### 點擊互動

```
可點擊項目：  cursor:pointer，hover 加淺色背景
active 狀態： 夜間 box-shadow inset 0 0 0 2px rgba(255,255,255,0.50)
              明亮 box-shadow inset 0 0 0 2px rgba(0,0,0,0.28)
toggle 行為：  再點一次同一項目 → 還原全部（currentFilter 重設為 "all"）
「全部」按鈕：  過濾列左側，點擊強制還原
```

### 5.4 頁首列

```
左側：  ICU 大字標（42px，白色 #FFFFFF + 綠光暈 text-shadow）
        夜間版：深海軍藍背景 #0A1520；明亮版：民生深綠背景 #2D7A55
中央：  病房主任姓名 ＋ 單位護理長姓名（均使用 --text-stats 白色系）
右側：  資料更新時間（13px）+ 日期（16px）+ 時間（30px）
        全部使用 --text-stats，確保兩種主題皆高對比可見
```

### 5.5 圖例 / 過濾列

```
標籤文字：         「圖例 / 過濾：」17px / --text-muted
「全部」按鈕：     Pill 形（border-radius 20px），17px / SemiBold
                   選中：--filter-active-bg（綠） + 深字；未選中：透明背景 + 綠邊框
13個 Badge 按鈕：  與卡片 Badge 同色（.badge-R / .badge-D / etc）
                   font-size: 15px；padding: 6px 14px；border-radius: 4px
                   兼作「圖例」（色彩直觀對應意義）與「過濾器」
選中 Badge 狀態：  夜間 box-shadow 0 0 0 2.5px #fff, 0 0 0 5px rgba(255,255,255,0.25)
                   明亮 box-shadow 0 0 0 2.5px #1A2635, 0 0 0 5px rgba(0,0,0,0.15)
toggle 行為：      再點一次同一 Badge → 還原全部
過濾列 gap：       10px
主題切換鈕：       16px，置右（margin-left: auto）
```

### 5.6 詳情 Modal

```
觸發：        點擊任一非空床的床位卡片
尺寸：        580px × auto（最大 85vh）
位置：        畫面正中央（fixed overlay）
圓角：        12px
遮罩：        夜間 rgba(0,0,0,0.75)；明亮 rgba(0,0,0,0.55)
關閉方式：    點擊遮罩 / 右上角 ✕ / 底部「關閉」按鈕

頂部標題區（modal-header）：
  - 床號（22px Black accent-green）
  - 病患姓名（24px Bold，M藍/F粉）
  - 性別/年齡（15px secondary）
  - 全部 Badge 標記（無數量限制）

內容區欄位佈局（modal-body）：
┌─────────────────────────────────────────┐
│  診斷（全寬）                           │
│  病歷號        生日（YYYY/MM/DD）  科別  │  ← 新增
│  主治醫師      責任護理師               │
│  入院日期      住院天數      病況等級   │
│  隔離狀態      DNR                      │
│  呼吸器        CRRT                     │
│  備註（全寬）                           │
└─────────────────────────────────────────┘
關閉按鈕（置底右）
```

### 5.7 底部功能標籤列

```
9個標籤等寬排列
高度：         56px
字體：         24px / SemiBold
選中：         白底（#FFFFFF）+ accent-green 文字 + font-weight:800
              + 頂部 4px accent-green 指示線（全寬）
未選中：       --bg-tabs 深色底 + --text-tab 灰字
hover：        --bg-tab-active 背景 + --text-tab-active 文字
```

---

## 6. 病床物理位置佈局（約50%還原）

### 6.0 病區標題格式

```
格式：  ▌ {樓層}　共 {床數} 床
範例：  ▌ 4F　共 20 床  /  ▌ 3F　共 5 床
```

### 6.1 4F 病區（左側，flex:4）

CSS Grid：7 columns（1fr 1fr 0.25fr 1fr 1fr 1fr 1fr）× 6 rows

```
【左群組 col 1-2】        【中群組 col 4-5】    【右群組 col 4-7】
F4-6  F4-7  [走道]  F4-1  F4-2
F4-5  F4-3
F4-9  F4-10
      F4-8（跨兩欄居中）
F4-12 F4-11                          F4-16（row6 col4）
F4-15 F4-13                F4-17 F4-19 F4-21（row5 col5-7）
                            F4-16 F4-18 F4-20 F4-22（row6 col4-7）
```

### 6.2 3F 病區（右側，flex:3）

CSS Grid：5 columns × 2 rows（JS syncGridRowHeights 與 4F 等高）

```
          [col3] F3-5

[col1]F3-4   [col3]F3-3 [col4]F3-2 [col5]F3-1
```

---

## 7. 信息架構

```
ICU 電子白板（主畫面）
├── 頁首列（72px）
│   ├── 站別（ICU）
│   ├── 病房主任姓名
│   ├── 單位護理長姓名
│   └── 即時時鐘 + 更新時間
├── 跑馬燈公告列
├── 圖例/過濾列（44px）
│   ├── [全部] 按鈕
│   ├── 13 個彩色 Badge 按鈕（兼圖例與過濾）
│   └── 夜間版/明亮版切換按鈕（置右）
├── 主要病床配置區（flex layout）
│   ├── 4F 病區（flex:4，左）
│   │   └── 20床卡片（CSS Grid，依物理位置）
│   └── 3F 病區（flex:3，右，grid-template-rows: auto auto 1fr）
│       ├── 3F 區標題
│       ├── 5床卡片（CSS Grid）
│       └── 病況統計面板（ws-row × 2）
│           ├── 第一列：總床數 / 住院 / 手術 / 檢查 / 會診
│           └── 第二列：穩定 / 重症 / 危急 / 隔離 / DNR / RRT
├── 詳情 Modal（點擊床位觸發）
└── 底部功能標籤列（56px，9個頁籤）
    ├── 病房動態（預設選中，顯示上方主要病床配置區）
    ├── 抗生素（待開發）
    ├── 管路（待開發）
    ├── 手術資訊（待開發）
    ├── 檢查/會診（待開發）
    ├── 連絡電話（待開發）
    ├── 派班資訊（待開發）
    ├── 佈告欄（待開發）
    └── 避難圖（待開發）
```

---

## 8. 核心交互流程說明

### 流程一：查看全區床位狀況
1. 護理師進入頁面 → 看到雙區床位配置圖（4F左、3F右）
2. 透過床位卡片左側邊框顏色快速辨識各床狀態
3. 透過右側統計面板掌握全區數字概覽（流量列 + 病況列）

### 流程二：點擊統計過濾床位
1. 護理師在統計面板點擊「重症 15」
2. 非重症床位淡出（opacity 0.2），重症床位正常顯示
3. 統計「重症」欄顯示 active 白色框線高亮
4. 再點一次「重症 15」→ 取消過濾，還原全部顯示
5. 或點擊圖例列「全部」按鈕 → 強制還原

### 流程三：使用圖例列 Badge 過濾
1. 護理師查看圖例列（每個 Badge 按鈕即為視覺圖例）
2. 點擊任一 Badge 按鈕（如「D」DNR）
3. 無 D 標記的床位淡出；D 按鈕出現白色光暈 active 狀態
4. DNR 統計欄位同步高亮（兩者共用 data-filter="D"）
5. 再點「D」按鈕 → 取消過濾，還原全部

### 流程四：查看特定床位詳情
1. 護理師點擊任一非空床的床位卡片
2. 畫面中央彈出詳情 Modal，顯示完整病患資料（含病歷號/生日/科別）
3. 點擊遮罩、右上角 ✕ 或「關閉」按鈕可關閉 Modal

### 流程五：切換功能頁籤
1. 點擊底部任一標籤（如「抗生素」）
2. 主要內容區切換至對應功能頁面（功能待開發）
3. 「病房動態」頁籤顯示主床位配置圖

---

## 9. 異常狀態設計

| 狀態 | 處理方式 |
|------|---------|
| 空床 | 卡片淡化顯示（opacity:0.6），僅顯示床號+「空床」，虛線邊框，不可點擊 |
| 資料載入中 | 床卡顯示 Skeleton 灰色佔位塊 |
| 資料更新失敗 | 頁首更新時間旁顯示紅色警示點，提示「連線異常」 |
| HIS 斷線 | 統計面板顯示「資料同步中斷 HH:MM」文字提示 |
| Modal 無資料 | 顯示「資料讀取中，請稍候」提示文字 |

---

## 10. 開發實現注意事項

### 10.1 響應式考量
- **主要目標**：1920×1080（Full HD），55吋螢幕
- 床卡使用 CSS Grid 佈局，不使用 Flex 換行，確保位置固定
- **grid-template-rows 必須使用 `repeat(N, minmax(0, 1fr))`**，不可用 `repeat(N, 1fr)`
- **3F 卡片等高**：`syncGridRowHeights()` JS 函式於 DOMContentLoaded 後讀取 4F 行高，
  設定 3F `grid-template-rows` 為相同 px 值

### 10.2 字體載入
- 優先使用系統字體（Microsoft JhengHei UI）避免外部字體加載延遲
- 數字使用 Roboto 或 tabular-nums 屬性，確保數字等寬對齊

### 10.3 資料更新
- 示意版本：使用靜態 Mock JSON 資料
- 頁首時鐘：每秒 setInterval 更新
- 資料同步狀態：每次更新時顯示「資料更新時間：剛剛」

### 10.4 Mock 示意資料規格

每床資料結構（完整欄位）：
```json
{
  "id": "F4-01",
  "floor": 4,
  "num": 1,
  "status": "occupied",
  "patient": {
    "name": "林○志",
    "gender": "M",
    "age": 72,
    "admission": "05/10",
    "diagnosis": "Septic shock, Pneumonia",
    "doctor": "蘇○醫師",
    "nurse": "陳○護理師",
    "condition": "重症",
    "medRecord": "A234567890",
    "birthDate": "1953/08/12",
    "department": "胸腔內科",
    "isolation": "無",
    "dnr": false,
    "ventilator": true,
    "crrt": false,
    "surgery": false,
    "exam": false,
    "consult": false,
    "rrt": false,
    "fallRisk": false,
    "dependency": false,
    "confidential": false,
    "noTreatment": false,
    "npo": true,
    "allergy": false,
    "chemo": false,
    "transport": null,
    "oxygen": false,
    "notes": ""
  }
}
```

> **Badge 自動計算**：不再使用 `badges[]` 陣列；由 `buildBadges(patient)` 函式依優先序自動從各布林欄位組合產生。

### 10.5 兩版主題切換
- 使用 CSS 自訂屬性（CSS Variables）管理色彩
- 頁面根元素切換 `data-theme="dark"` / `data-theme="light"`
- 預設夜間版；設定儲存於 `localStorage("icu-theme")`

### 10.6 過濾系統架構
- `currentFilter` 全域變數儲存當前過濾條件（預設 `"all"`）
- `[data-filter]` 選取器統一綁定點擊事件（含圖例列按鈕 + 統計面板 ws-item）
- 床卡 HTML 屬性：`data-badges`（JSON）/ `data-surgery` / `data-exam` / `data-consult` / `data-cond`
- `applyFilter()` 依 currentFilter 決定顯示/淡出邏輯
- **Toggle**：若點擊的 filter 值與 currentFilter 相同（且非 "all"），則重設為 "all"

---

## 11. 設計檔案清單

| 交付物 | 說明 |
|--------|------|
| DESIGN_SPEC.md | 本設計規範文檔（v1.2） |
| PRD.md | 產品需求文檔（v1.2） |
| manual.html | 規格驗證 + 使用者操作說明（可於瀏覽器直接開啟） |
| index.html + css/ + js/ | 前端實作原始碼 |

---

✅ 設計規範文檔 v1.2 已更新完畢。
