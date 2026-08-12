import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export default defineNuxtPlugin((nuxtApp) => {
  if (!Capacitor.isNativePlatform()) return

  void Promise.all([
    StatusBar.setStyle({ style: Style.Light }),
    StatusBar.setBackgroundColor({ color: '#171717' }),
    StatusBar.setOverlaysWebView({ overlay: false })
  ])

  const backListener = App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
      return
    }
    void App.minimizeApp()
  })

  nuxtApp.hook('app:beforeUnmount', () => {
    void backListener.then(listener => listener.remove())
  })
})
