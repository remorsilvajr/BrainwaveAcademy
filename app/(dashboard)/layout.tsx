import Link from "next/link";
import { LucideIcon, LayoutDashboard, Megaphone, UserPlus, ClipboardList, CreditCard, Activity, User, Settings, LogOut } from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/parent", icon: LayoutDashboard },
    { name: "Announcements", href: "/parent/announcements", icon: Megaphone },
    { header: "ENROLLMENT" },
    { name: "Enroll A Student", href: "/parent/enroll", icon: UserPlus },
    { name: "Requirements", href: "/parent/requirements", icon: ClipboardList },
    { name: "Payments", href: "/parent/payments", icon: CreditCard },
    { name: "Enrollment Status", href: "/parent/status", icon: Activity },
    { header: "STUDENT" },
    { name: "Student Profile", href: "/parent/student-profile", icon: User },
    { name: "Student Dashboard", href: "/parent/student-dashboard", icon: LayoutDashboard },
    { header: "ACCOUNT" },
    { name: "My Profile", href: "/parent/profile", icon: User },
    { name: "Settings", href: "/parent/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const activePath = "/parent"; // Match dynamically via usePathname()

    return (
        <div className="flex min-h-screen bg-[#F4F6F8]">
            {/* Dark Navy Sidebar */}
            <aside className="w-64 bg-brand-navy text-white flex flex-col justify-between p-4 shrink-0">
                <div>
                    <div className="flex flex-col items-center py-4 mb-4 border-b border-white/10">
                        <img src="/assets/bwa_logo.png" alt="Brainwave Academy" className="h-12 w-auto mb-2" />
                        <span className="font-heading font-bold text-lg">Brainwave Academy</span>
                        <span className="text-xs text-white/60">Parent Portal</span>
                    </div>

                    <nav className="space-y-1">
                        {navigation.map((item, idx) => {
                            if (item.header) {
                                return (
                                    <p key={idx} className="text-[11px] font-semibold text-white/40 tracking-wider px-3 pt-4 pb-1">
                                        {item.header}
                                    </p>
                                );
                            }

                            const isActive = activePath === item.href;
                            const Icon = item.icon as LucideIcon;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href!}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-brand-pink text-white shadow-md"
                                        : "text-white/80 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 transition-colors mt-6">
                    <LogOut className="w-5 h-5" />
                    Log Out
                </button>
            </aside>

            {/* Main Content Viewport */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <h2 className="font-heading font-bold text-xl text-brand-navy">Brainwave Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-700 font-medium">
                            <option>Student: Liam Santos</option>
                        </select>
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                            <div className="w-7 h-7 rounded-full bg-brand-skyText text-white flex items-center justify-center font-bold text-xs">
                                DJ
                            </div>
                            <div className="text-xs">
                                <p className="font-bold text-gray-800">Doe, Jane C.</p>
                                <p className="text-gray-500">Parent / Guardian</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}