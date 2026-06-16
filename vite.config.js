import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'defect-report-tracker' with your actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/defect-report-tracker/',
})
