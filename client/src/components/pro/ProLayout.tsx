'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subscribeToAuthChanges } from '@/lib/auth';
import { fetchProStatus } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  FileText,
  Menu,
  X,
  Home,
  LogOut,
  Settings,
  TrendingUp,
  Bell
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

interface ProLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/pro/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/pro/profile', icon: User },
  { name: 'Leads', href: '/pro/leads', icon: TrendingUp },
  { name: 'Jobs', href: '/pro/jobs', icon: Briefcase },
  { name: 'Messages', href: '/pro/messages', icon: MessageSquare },
  { name: 'Calendar', href: '/pro/calendar', icon: Calendar },
  { name: 'Offers', href: '/pro/offers', icon: FileText },
];

export default function ProLayout({ children }: ProLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proInfo, setProInfo] = useState<{ display_name: string | null; logo_url: string | null } | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Load cached data after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const cached = localStorage.getItem('pro_info');
    if (cached) {
      try {
        setProInfo(JSON.parse(cached));
      } catch (e) {
        // Invalid cache, ignore
      }
    }
  }, []);

  useEffect(() => {
    // Fetch pro info and token for display purposes only (non-blocking)
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user?.email) return;

      try {
        const token = await user.getIdToken();
        setUserToken(token);

        const status = await fetchProStatus(user.email);
        const newProInfo = {
          display_name: status.display_name || null,
          logo_url: status.logo_url || null
        };

        setProInfo(newProInfo);
        // Cache to localStorage for instant load on next navigation
        localStorage.setItem('pro_info', JSON.stringify(newProInfo));
      } catch (e) {
        console.error('Failed to fetch pro status:', e);
      }
    });

    return () => { if (unsub) unsub(); };
  }, []);

  const isActive = (href: string) => {
    if (href === '/pro/dashboard') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const { auth } = await import('@/firebase');
    await auth.signOut();
    // Clear cached pro info on logout
    localStorage.removeItem('pro_info');
    router.push('/login');
  };

  return (
    <div className={"flex flex-col min-h-screen "}>
      {/* App Header - Very Top */}
      <div className=" top-0 left-0 right-0 h-14 bg-gray-900 text-white ">
        <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Mestermind</span>
            <span className="text-sm text-gray-400 hidden sm:inline">Pro Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-gray-300 transition-colors">
              Back to Site
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} >
        <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="absolute top-0 bottom-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {mounted && proInfo?.logo_url ? (
                <img src={proInfo.logo_url} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {mounted && proInfo?.display_name?.[0]?.toUpperCase() || 'P'}
                </div>
              )}
              <h1 className="text-lg font-bold text-gray-900">
                {mounted && proInfo?.display_name || 'Pro Dashboard'}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4 space-y-1">
            <Link
              href="/pro/calendar-settings"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Link>
            <Link
              href="/"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <Home className="mr-3 h-5 w-5" />
              Back to Site
            </Link>
          </div>
        </div>
      </div>
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className=" lg:block w-64 flex-shrink-0">
          <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-y-auto">
            <div className="flex h-16 items-center px-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {mounted && proInfo?.logo_url ? (
                  <img src={proInfo.logo_url} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {mounted && proInfo?.display_name?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
                <h1 className="text-lg font-bold text-gray-900">
                  {mounted && proInfo?.display_name || 'Pro Dashboard'}
                </h1>
              </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4 space-y-1">
              <Link
                href="/pro/calendar-settings"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${router.pathname === '/pro/calendar-settings'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Link>
              <Link
                href="/"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
              >
                <Home className="mr-3 h-5 w-5" />
                Back to Site
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 ">
          {/* Top bar */}
          <div className="sticky bg-white shadow-sm z-10 top-0">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-4 ml-auto">
                {userToken && <NotificationBell token={userToken} />}
                <div className="text-sm text-gray-700 hidden sm:block">
                  {proInfo?.display_name || 'Professional'}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

