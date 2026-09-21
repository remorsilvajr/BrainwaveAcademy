// The parent portal's selected child lives only in the `?student=` URL param
// (the top bar's switcher sets it; the sidebar carries it across). A link
// inside a page that points at another per-child page must carry it too, or
// the top bar falls back to the first child on arrival: a parent who picked
// their second child and clicked "View Payments" on the dashboard landed on
// the first child's payments. Pass the page's own `student` search param.
export function withStudent(href: string, studentParam: string | null | undefined): string {
  return studentParam ? `${href}?student=${encodeURIComponent(studentParam)}` : href
}
