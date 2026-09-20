'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { BugReportModal } from '@/components/feedback/bug-report-modal'
import { MyFeedbackModal } from '@/components/feedback/my-feedback-modal'

// w-full + text-left matter here, not just block — an <a> (My Profile/
// Settings) is a plain block-level box that fills its container width with
// nothing more than `block`, but a <button> (Log Out) is a form control:
// browsers can still shrink it to fit its text content even under
// `display: block`, leaving the rest of the row visually part of the item
// but not actually clickable. Reported live as "can only click half" on
// the Log Out row specifically, never My Profile/Settings — exactly this.
const ITEM_CLASSNAME =
  'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'

// Shared account dropdown used both by the landing page's header (once
// logged in) and the parent/teacher portal top bars — trigger content is
// passed as children so each caller keeps its own visual treatment (a bare
// avatar icon on the landing page vs. the existing avatar+name+role block
// in the portal top bars), while the open/close state, backdrop, and panel
// positioning live here once instead of being duplicated per caller.
export function ProfileMenu({
  myProfileHref,
  settingsHref,
  triggerClassName,
  // Parent/teacher moved Report a Bug / Feedback & Concerns / My Feedback
  // into their own sidebar Feedback page (app/parent/feedback,
  // app/teacher/feedback — see components/feedback/feedback-tabs.tsx), so
  // this dropdown stays admin/public-site-only for those three. Defaults to
  // shown, since admin and the logged-in landing-page header still rely on
  // this dropdown as their only entry point for them.
  showFeedbackLinks = true,
  children,
}: {
  myProfileHref?: string
  settingsHref: string
  triggerClassName?: string
  showFeedbackLinks?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showMyFeedback, setShowMyFeedback] = useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = useState(pathname)

  // Same "adjust state inline during render when a prop changes" pattern
  // as ParentTopBar's own student-selector dropdown — a sidebar/portal
  // <Link> navigates via router.push without ever triggering this panel's
  // click-away backdrop, so without this the menu stayed open (and stale)
  // across a page change.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClassName}>
        {children}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* left-0 sm:left-auto sm:right-0, not a bare right-0 — a trigger
              that ends up flush against the left edge of its own wrapped
              line on a narrow viewport (see the ParentTopBar/StudentSelector
              note in CLAUDE.md) would otherwise push a right-anchored panel
              off the left side of the screen entirely. */}
          <div className="absolute left-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg sm:left-auto sm:right-0">
            {myProfileHref && (
              <Link href={myProfileHref} onClick={() => setOpen(false)} className={ITEM_CLASSNAME}>
                My Profile
              </Link>
            )}
            <Link href={settingsHref} onClick={() => setOpen(false)} className={ITEM_CLASSNAME}>
              Settings
            </Link>
            {showFeedbackLinks && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setShowBugReport(true)
                  }}
                  className={ITEM_CLASSNAME}
                >
                  Report a Bug
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setShowFeedback(true)
                  }}
                  className={ITEM_CLASSNAME}
                >
                  Feedback &amp; Concerns
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setShowMyFeedback(true)
                  }}
                  className={ITEM_CLASSNAME}
                >
                  My Feedback
                </button>
              </>
            )}
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <LogoutButton className={ITEM_CLASSNAME} />
          </div>
        </>
      )}

      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} initialCategory="bug" />}
      {showFeedback && <BugReportModal onClose={() => setShowFeedback(false)} initialCategory="concern" />}
      {showMyFeedback && <MyFeedbackModal onClose={() => setShowMyFeedback(false)} />}
    </div>
  )
}
