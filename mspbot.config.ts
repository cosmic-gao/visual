import { defineConfig } from 'mspack'
import react from '@mspbots/react'


export default defineConfig({
  plugins: [
    react({
      strategy: 'default',
      
      opt: {
        minify: true,
        treeshake: true,
      },
      
      system: {
        app: {
          name: 'MSPBots App',
          title: 'MSPBots React Template',
          icon: '/vite.svg',
        },
        auth: {
          enabled: true,
          loginPath: '/apps/mb-platform-user/login',
        },
        theme: {
          primary: '168 77% 40%',
          primaryDark: '168 77% 45%',
          radius: '0.75rem',
        },
        layout: {
          mode: 'vertical',
          collapsible: true,
          defaultCollapsed: false,

          header: {
            title: 'Development Environment (DEV) — Data may be test or unstable',
          },

          toolbar: {
            settingsDisabled: true,
            languageDisabled: true,
            fullscreenDisabled: true,
            notificationsDisabled: true,
        
            disabledTooltip: 'Development Environment (DEV) — Data may be test or unstable',
          },
        },
      },
    }),
  ],
  
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
})
