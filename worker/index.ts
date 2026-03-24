declare const self: ServiceWorkerGlobalScope

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Die Bögstophs", {
      body: data.body ?? "",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus()
      return self.clients.openWindow("/dashboard")
    })
  )
})
