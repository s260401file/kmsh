---
tags: [kmsh, LDAP, AD, 資安, MOC]
---
# LDAP 分類總覽

護理電子白板系統的帳號認證（AD／LDAP）相關資訊集中於此目錄。

## 現況（一句話）
院方原無 AD，依 2026-07-02 會議決議，於 **101 主機**（即本應用主機）架 **AD LDS**（Windows 內建輕量 LDAP，非網域控制站），供白板管理後台「**每人專屬帳號＋登入／登出留存（可勾稽）**」。白板只透過 **LDAP bind** 驗證密碼；單位／角色權限仍用本地 `StaffUnitRole`。已上線、58 位在職人員帳號可登入。

## 文件
- [[AD-LDS-安裝記錄]] — 安裝決策、實例設定、踩過的雷、維運（改密／新增／停用／LDAPS／備份）。
- [[帳號連動AD-規劃]] — 後台三項（新增帳號／管理員重設／自助改密）＋停用連動 AD 的實作規劃（決策：授權 app pool 身分寫入）。
- **操作說明（HTML＋截圖）**：`Document/LDAP帳號管理操作說明.html` — 帳號**增／刪／查／改**逐步操作，附實際畫面。
- 登入端使用者說明：`html_demo/登入帳號操作說明.html`（如何登入／權限／登出／錯誤排解）。

## 關鍵資訊速查
| 項目 | 值 |
|---|---|
| 目錄類型 | AD LDS 實例 `kmshldap`（服務 `ADAM_kmshldap`，開機自啟） |
| 連線 | `127.0.0.1:3890`（本機；日後可加 LDAPS 6360） |
| 分區 / 帳號位置 | `DC=kmsh,DC=local` / `OU=people`；DN＝`CN=<員編>,OU=people,DC=kmsh,DC=local` |
| 帳號＝ | 員編；初始密碼 `Kmsh@<員編>`（AD LDS 強制複雜度） |
| 管理工具 | `C:\kmsh-ldap\ldap-admin.ps1`（Ldap-List/Get/Add/Reset/Disable/Enable/Delete） |
| 白板端設定 | `appsettings.json` 的 `Ldap` 區段（Enabled/Host/Port/BindDnFormat） |

## 待強化
LDAPS 加密、AD LDS 資料備份。~~停用帳號與 Staff 同步、app 內自助改密／建帳號連動~~ → **已上線（2026-07-10）**：後台建帳號自動建 AD、管理員重設、使用者自助改密、IsActive 停用連動；詳 [[帳號連動AD-規劃]]（app pool 改用專用服務帳號 `.\kmshldapsvc` 寫 AD、稽核遮蔽密碼、M999 測 8/8）。

相關：[[00-總覽]] · [[工作項目回報]] · [[DbSync-同步策略]]
