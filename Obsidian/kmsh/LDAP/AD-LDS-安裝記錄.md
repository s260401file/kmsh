---
tags: [kmsh, AD, LDAP, 安裝記錄, 資安]
---
# 101 主機 LDAP 安裝記錄

> 建立 2026-07-04。依 2026-07-02 會議：院方無 AD，於 **101 主機**架 LDAP，供白板管理後台「每人專屬帳號＋登入登出留存」。**這台主機即 101。**
> 相關：[[DbSync-同步策略]] · 會議記錄（後臺設定與帳號資安）

## 目的
- 在 101 架輕量 LDAP 目錄；白板 API **僅透過 LDAP bind 認證**（帳密於 LDAP 端管理），授權（單位/角色）仍用本地 `StaffUnitRole`。
- app 端已就緒：`Services/LdapAuthenticator.cs` ＋ `appsettings.json` 的 `Ldap` 區段（`Enabled/Host/Port/UseSsl/BindDnFormat`）。**只要填連線參數＋`Enabled=true` 即接上，不需再改程式。**

## 環境（2026-07-04 實測）
- Windows Server 2022 Standard；**無 Docker**；對外可連 GitHub；埠 389 / 3890 / 6360 皆空；無既有 LDAP 服務。

## ★ 關鍵發現：LLDAP 無 Windows 原生執行檔
- LLDAP 最新 **v0.6.3 只發布 Linux 二進位**（amd64/aarch64/armhf `.tar.gz`），**無 Windows 版**。
- 要在本機（Windows）跑 LLDAP → 需 **Docker（跑 Linux 容器）** 或 **WSL2**（皆為額外相依）。

## 路線選項（待建置方決定）
| 路線 | 說明 | 優點 | 缺點 |
|---|---|---|---|
| **A. AD LDS**（Windows 內建輕量 LDAP，**非**網域控制站） | 用內建角色建一個 LDAP 目錄實例 | 原生、免下載、服務常駐、最省事可靠 | 無 Web 管理 UI（改用 PowerShell/ADSI 管理、設密） |
| B. LLDAP via Docker | 貼合會議選的 LLDAP、有 Web UI、可自助改密 | 功能完整、好管理 | 需在 Windows 裝 Docker 跑 Linux 容器（較重） |
| C. LLDAP via WSL2 | 於 WSL 跑 LLDAP Linux 版 | 有 Web UI | 需裝 WSL、顧 WSL 開機常駐與埠轉發 |
| D. ApacheDS（Java） | 有 Windows 安裝檔的 LDAP 服務 | 原生服務 | 設定較繁、非會議所提 |

**建議**：要「Windows 原生、最省事、可靠常駐」→ **A. AD LDS**；若一定要 LLDAP 的 Web 自助改密 → B（Docker）。

## 共同決策（已定）
- base DN：`dc=kmsh,dc=local`
- LDAP 埠：`3890`（LDAPS 6360 之後加憑證）
- 使用者 username＝**員編**；初始密碼＝員編（首次登入後改）
- 帳號來源：從白板 `Staff` 表批次匯入
- 常駐：Windows 服務／工作排程開機啟動

## ✅ 已完成安裝（2026-07-04，路線 A：AD LDS）
- 角色：`Install-WindowsFeature ADLDS`（免重開機）。
- 實例：**kmshldap**，服務 `ADAM_kmshldap`（**Automatic 開機自啟**，免排程）；LDAP 埠 **3890**、SSL 埠 6360（暫未啟用）；分區 **DC=kmsh,DC=local**；實例管理者＝`本機\Administrators`。
- Schema：`ldifde` 匯入 `MS-User.LDF`（取得 `user` 類別）。**注意：MS-*.LDF 為 ANSI，`ldifde` 不可加 `-u`**。
- 結構：`OU=people,DC=kmsh,DC=local`；使用者 `CN=<員編>,OU=people,DC=kmsh,DC=local`。
- 帳號：從 `Staff`（在職 58 人）批次匯入，**username=員編、初始密碼＝`Kmsh@<員編>`、已啟用**。腳本 `C:\kmsh-ldap\seed-from-staff.ps1`（實跑用 inline，見備註）。
- app 接上：`appsettings.json` → `Ldap.Enabled=true, Host=127.0.0.1, Port=3890, BindDnFormat="CN={uid},OU=people,DC=kmsh,DC=local"`，已重部署。

## 關鍵眉角（踩過的雷）
- **密碼複雜度**：AD LDS 沿用本機密碼政策，**強制複雜度**（本機 minPwdLength=0，但複雜度為 on）→ 純員編（如 `MB69`）**不被接受**，故初始密碼用 `Kmsh@<員編>`（含大小寫＋特殊＋數字）。
- **設密碼要加密通道**：ADSI `SetPassword` 在無憑證的 AD LDS 會失敗；改用 **`System.DirectoryServices.Protocols` 的 sign+seal 連線改 `unicodePwd`**（免憑證），再設 `msDS-UserAccountDisabled=FALSE` 啟用。
- **simple bind**：AD LDS 預設允許明文 simple bind → app 以 `127.0.0.1:3890` simple bind 即可（同機、不出網，可接受；日後可加 LDAPS）。
- 分區頭無 `pwdProperties/minPwdLength` 屬性（AD LDS 非網域），故複雜度不能靠改分區屬性關閉。

## 實測（通過）
- `ADMIN`/`Kmsh@ADMIN` → 200（isAdmin、四站）；`MB69`/`Kmsh@MB69` → 200（ER）；錯密碼 → 401；`LoginAudit` 有記錄。

## 維運
- **改密／重設**：目前於 AD LDS 端處理（可用相同 sealed `unicodePwd` 手法寫腳本，或 ADSI Edit 連 `localhost:3890`）。**尚未做 app 內自助改密**（如需，另開發改密頁）。
- **新進人員**：先在後台「人員管理」建入 `Staff`，再重跑 seed（會補建新員編）。
- **停用**：`Staff` 停用不會自動關 AD LDS 帳號；需同步在 AD LDS 設 `msDS-UserAccountDisabled=TRUE`（可加進 seed 腳本比對）。
- **待強化**：LDAPS（加伺服器憑證於 6360，app `UseSsl=true`）、AD LDS 資料備份（`C:\Program Files\Microsoft ADAM\kmshldap\data`）、停用帳號同步、app 自助改密。

## 目前狀態
**AD LDS 已在 101 上線並與白板後台接通、58 人帳號可登入。** 初始密碼 `Kmsh@<員編>`，請通知同仁；密碼變更暫由 AD 端處理。
