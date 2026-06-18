/*
 * main.jsx — 應用程式進入點（entry point）
 * 將 React 應用掛載到 index.html 的 #root。
 * 由外而內包裝：StrictMode（開發檢查）→ BrowserRouter（前端路由）
 * → AuthProvider（登入狀態 Context）→ App（路由總表）。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
