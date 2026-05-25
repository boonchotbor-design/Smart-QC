import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Vipcode-AI-Inspector/', // ตรงกับชื่อ Repo บน GitHub
})
