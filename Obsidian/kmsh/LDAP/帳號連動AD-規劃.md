---
tags: [kmsh, LDAP, 規劃]
---
# 後台帳號／密碼連動 AD LDS — 規劃

> 目標：後台三項連動 AD LDS（`localhost:3890`）：① 新增帳號 ② 管理員重設密碼 ③ 使用者自助改密，＋ ④ 停用連動。
> 現況：app 只 bind 驗證（[[00-LDAP總覽]]、`Services/LdapAuthenticator.cs`），**不寫 AD**；建帳號只進本地 SQL `Staff`，改密/建帳號目前靠 `C:\kmsh-ldap\*.ps1` 手動。
> 決策（2026-07-10）：**寫入身分＝授權 app pool 身分**（免存密碼）；**範圍＝三項＋停用連動**（不含刪除）。
> 建立 2026-07-10。相關：[[AD-LDS-安裝記錄]]、[[後台總覽]]。

## ✅ 已實作並驗證（2026-07-10）
四項全上線，M999 端到端測試 **8/8 PASS**（初始密碼登入、管理員重設、舊密失效、自助改密、錯誤舊密被擋、停用擋登入、重新啟用）；稽核 `OperationAudit` 密碼欄位遮蔽為 `***`（0 明碼外洩）。
- 後端：`Services/LdapAdminService.cs`（Negotiate+Sign&Seal 寫 AD）＋ `BoardController` 端點 `personnel/{id}/ad-account`、`personnel/{id}/reset-password`（限 Admin）、`personnel/change-password`（自助，員編取自 token）；`UpdateStaff` 連動 `SetEnabled`。`OperationAuditFilter` 加密碼遮蔽。
- 前端：帳號設定列「重設密碼／建AD」（系統層）、建帳號自動連動建 AD、選單「我的帳號 › 修改密碼」。

### ⚠️ 與原決策的差異（重要）
原訂「授權 **app pool 虛擬帳號**（ApplicationPoolIdentity）」寫 AD **行不通**：AD LDS 無法把 `IIS APPPOOL\kmsh-whiteboard-api` 的虛擬 SID 對映為可驗證主體，Negotiate `Bind()` 結果為**匿名**（寫入報 `000004DC: a successful bind must be completed`）。
→ 改為 **專用本機服務帳號 `.\kmshldapsvc`** 執行 app pool（Negotiate 綁定為真實帳號才成功）：
- 密碼存於 **IIS app pool 設定（Windows 加密）**，**非** appsettings（仍符合「設定檔不存密碼」）。要輪替/查詢可用 `Set-LocalUser` 重設。
- 授權：`dsacls "\\localhost:3890\OU=people,DC=kmsh,DC=local" /I:T /G "<機器>\kmshldapsvc:GA"`（OU=people Full Control）。
- 站台檔案存取：`kmshldapsvc` 已加入 `IIS_IUSRS` 並對 `C:\inetpub\wwwroot\kmsh-api` 授 Modify（含 `uploads/evac`、`logs`）。

### 建立帳號注意
`CreateUser`：`AddRequest(objectClass=user)` → 設 `unicodePwd` → `msDS-UserAccountDisabled=FALSE`；已存在則只補設密碼＋啟用。實測乾淨建立即可用初始密碼 `Kmsh@<員編>` 登入。

### 完整 CRUD 連動（2026-07-10 追加，測 8/8）
後端 `personnel` 端點全面連動（best-effort，AD 失敗不擋本地）：
- **建立**（`POST personnel`）：系統層/單位層新增皆自動建 AD（`CreateUser`，初始密碼 `Kmsh@員編`）。前端不再各自呼叫、由後端統一處理。
- **修改**（`PUT personnel/{id}`）：**員編變更 → AD 改名**（`RenameUser`：`ModifyDNRequest` CN rename，沿用密碼）；再依 `IsActive` 啟用/停用。
- **刪除**（`DELETE personnel/{id}`）：**AD 帳號停用**（`SetEnabled false`，**不實際刪除**——保留軌跡、可復職）。
測試：建立→AD 存在＋初密可登入；改員編→AD 改名、舊名消失、沿用密碼可登入；刪除→AD 仍在但停用、擋登入。

## 機制（沿用已驗證的 PowerShell 手法）
`C:\kmsh-ldap\ldap-admin.ps1` 已證實可行，照搬到 .NET：
- 連線：`System.DirectoryServices.Protocols.LdapConnection` → `localhost:3890`，`AuthType=Negotiate`、`SessionOptions.Signing=true`、`Sealing=true`、`Bind()`（**用執行者的 Windows 身分，不帶帳密**）。sealed 連線即滿足 AD LDS「設密碼需加密連線」的要求，**免 LDAPS 憑證**。
- 設密碼：`unicodePwd`（UTF-16LE 前後加雙引號的位元組）`Replace`。
- 建帳號：`CN=<員編>,OU=people,DC=kmsh,DC=local` objectClass=user → 設 `unicodePwd` ＋ `msDS-UserAccountDisabled=FALSE`。
- 停用/啟用：`msDS-UserAccountDisabled` = `TRUE`/`FALSE`。

## 前提（infra，必須先做）
- **授權 `IIS APPPOOL\kmsh-whiteboard-api`（app pool ApplicationPoolIdentity）對 AD LDS 有建帳號/重設密碼權**：加入該 AD LDS instance 的 Administrators 角色，或於 `OU=people` 委派「建立 user 物件」＋「重設密碼」。
  - 這樣 app 以自己的 Windows 身分做 Negotiate sealed 綁定，**設定檔不存任何密碼**。
- 確認 AD LDS **密碼原則**（長度/複雜度），前後端一致檢核。

## 後端
1. **`LdapAdminService`**（DI 單例；讀現有 `Ldap` 設定區段）：
   - `CreateUser(emp, pwd)`：`AddRequest`（objectClass=user, CN=emp）→ `unicodePwd` Replace ＋ `msDS-UserAccountDisabled=FALSE`；已存在則略過。
   - `ResetPassword(emp, newPwd)`：`unicodePwd` Replace。
   - `ChangePassword(emp, oldPwd, newPwd)`：先用 `LdapAuthenticator.Authenticate(emp, oldPwd)` 驗舊密 → 通過才設新密。
   - `SetEnabled(emp, bool)`：`msDS-UserAccountDisabled`。
   - 連線工廠：Negotiate + Signing + Sealing + `Bind()`。
2. **端點**（`BoardController` personnel 區）：
   - 建帳號連動：`POST personnel` 成功後呼叫 `CreateUser`（**best-effort**：AD 失敗回警告但 Staff 已建）。
   - `POST personnel/{id}/reset-password`（**限 Admin**）：{ newPassword }。
   - `POST personnel/change-password`（**任一登入者；員編取自 JWT、不由前端指定**）：{ oldPassword, newPassword }。
   - 停用連動：`Staff.IsActive` 切換時 → `SetEnabled`（false=停用即擋登入）。
3. **資安**：
   - ⚠️ **稽核遮蔽**：`OperationAuditFilter`（schema_v22）會把 request body 記進 `OperationAudit` → 這三支會把**新密碼明碼**寫入。**必須對含 password 的端點遮蔽密碼欄位**（改 filter 或標記端點）。
   - reset 限 Admin；change 只能改自己（emp 由 token 推導）。
   - 密碼原則檢核，錯誤回友善訊息（AD 丟例外→轉譯）。
   - `Ldap.Enabled=false` 或 AD 不可達 → 降級：Staff 照建，回「AD 未連動」提示，不讓整個建立失敗。

## 前端
- **帳號設定（`StaffSection`）**：每列加「重設密碼」（Admin）；建人員時可勾「同時建 AD 帳號（初始密碼 `Kmsh@<員編>`）」；停用切換連動。
- **新增「修改密碼」頁/選單**（任一登入者）：舊密＋新密＋確認。
- `wardApi`：`resetPassword(id, pwd)` / `changePassword(old, new)` / `createStaff` 帶 `createAd` 旗標。

## 驗收
- 建帳號 → AD 出現、`Kmsh@員編` 可登入。
- 管理員重設 → 新密可登入、舊密失效。
- 自助改密 → 驗舊密、改成功；**改他人帳號改不動**（token 綁定）。
- 停用人員 → 該帳號即刻無法登入（bind 被擋）。
- 稽核 `OperationAudit` **不含明碼密碼**。
- AD 關閉（`Enabled=false`）→ 建 Staff 仍成功並提示未連動。

## 風險 / 備註
- **前提未授權前，AD 寫入會失敗**（權限）；程式先落地、降級處理，授權後即生效。
- 建帳號屬性以 PS 驗證過的 `user` + `unicodePwd` + `msDS-UserAccountDisabled` 為準。
- 首次上線建議先在測試員編（如 `M999`）跑一輪四種情境。
