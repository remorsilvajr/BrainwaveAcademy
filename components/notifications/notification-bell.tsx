'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Clock, HandCoins, Images, Inbox, MessageSquare, UserMinus, Wallet, type LucideIcon } from 'lucide-react'
import { getMyNotifications, markNotificationsRead, type NotificationItem } from '@/components/notifications/actions'
import { formatRelativeTime } from '@/lib/format'

const POLL_MS = 60_000

const kindIcons: Record<string, LucideIcon> = {
  money: Wallet,
  photos: Images,
  unenroll: UserMinus,
  reminder: Clock,
  request: HandCoins,
  message: MessageSquare,
}

// The bell in every portal's top bar. It asks the server for its own
// notifications (RLS-scoped) on mount, every minute, when the tab regains focus
// and whenever it's opened, so a new one shows up without a page reload. A
// failed fetch is ignored: the badge simply stays as it was.
export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const result = await getMyNotifications()
      if (!alive.current) return
      setItems(result.items)
      setUnread(result.unread)
      setLoaded(true)
    } catch {
      // keep the previous state
    }
  }, [])

  useEffect(() => {
    alive.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- an initial fetch from an external system (the server), not derived state
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh()
    }
    // The sidebar clears a tab's notifications when it is opened; refresh straight away.
    const onChanged = () => void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('notifications-changed', onChanged)
    return () => {
      alive.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('notifications-changed', onChanged)
    }
  }, [refresh])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) void refresh()
  }

  async function handleMarkAllRead() {
    setItems((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnread(0)
    await markNotificationsRead()
  }

  async function handleOpenItem(item: NotificationItem) {
    setOpen(false)
    if (!item.read_at) {
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)))
      setUnread((count) => Math.max(0, count - 1))
      void markNotificationsRead([item.id])
    }
    if (item.href) router.push(item.href)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e6007e] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed right-2 top-16 z-20 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:right-0 sm:top-auto sm:mt-2">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notifications {unread > 0 && <span className="ml-1 text-xs font-normal text-gray-400">({unread} new)</span>}
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-semibold text-[#00a3e0] hover:underline dark:text-sky-400"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {!loaded ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                    <Inbox className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">You&apos;re all caught up</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">New notifications will show up here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item) => {
                    const Icon = kindIcons[item.kind] ?? Bell
                    const isUnread = !item.read_at
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenItem(item)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isUnread ? 'bg-sky-50/60 dark:bg-sky-950/20' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isUnread
                                ? 'bg-[#e6007e]/10 text-[#e6007e]'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                              {item.title}
                            </span>
                            {item.body && (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500 dark:text-gray-400">{item.body}</span>
                            )}
                            <span className="mt-1 block text-[11px] text-gray-400 dark:text-gray-500">{formatRelativeTime(item.created_at)}</span>
                          </span>
                          {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#e6007e]" aria-hidden />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
