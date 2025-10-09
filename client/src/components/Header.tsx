"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LuChevronDown, LuLogOut, LuMenu } from "react-icons/lu";
import ServicesPopover from "./ServicesPopover";
import Link from "next/link";
import { useRouter } from "next/router";
import { subscribeToAuthChanges, logout, getAuthToken } from "@/lib/auth";
import { fetchIsProByEmail, fetchProProfileByEmail, getNotifications } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
  const router = useRouter();
  const isHomePage = router.pathname === "/";
  
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  

  const handleSignOut = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      // Clear pro flag cookie so middleware stops treating user as pro
      try {
        document.cookie = "is_pro=; Path=/; Max-Age=0; SameSite=Lax";
      } catch {}
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      setIsSignedIn(Boolean(user));
      if (user?.email) {
        try {
          // Get auth token
          const token = await getAuthToken();
          setAuthToken(token);

          const { is_pro } = await fetchIsProByEmail(user.email);
          const pro = Boolean(is_pro);
          setIsPro(pro);
          // Write lightweight pro flag cookie for middleware-based routing
          try {
            document.cookie = `is_pro=${pro ? 'true' : 'false'}; Path=/; SameSite=Lax`;
          } catch {}
          const profile = await fetchProProfileByEmail(user.email);
          setAvatarUrl(profile?.logo_url || null);
          const name =
            profile?.display_name || user.displayName || user.email || "";
          setUserName(name);
          setUserEmail(user.email || "");
          const parts = String(name).trim().split(/\s+/);
          const initials =
            (parts[0]?.[0] || "").toUpperCase() +
            (parts[1]?.[0] || "").toUpperCase();
          setUserInitials(initials || (user.email?.[0] || "").toUpperCase());
        } catch {
          setIsPro(false);
          setAvatarUrl(null);
          setUserInitials("");
          setAuthToken(null);
          setUserName("");
          setUserEmail("");
        }
      } else {
        setIsPro(false);
        setAvatarUrl(null);
        setUserInitials("");
        setAuthToken(null);
        setUserName("");
        setUserEmail("");
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setUnreadCount(0);
      return;
    }
    (async () => {
      try {
        const res = await getNotifications(authToken, { limit: 1 });
        setUnreadCount(res.unread_count || 0);
      } catch {
        setUnreadCount(0);
      }
    })();
  }, [authToken]);

  return (
    <header className={`w-full relative overflow-visible ${
      isHomePage 
        ? "absolute top-0 left-0 z-30 border-b border-white/20" 
        : "bg-white/90 backdrop-blur-sm border-b border-gray-200"
    }`}
    style={{
      position: isHomePage ? "absolute" : "relative",
      borderBottomWidth: isHomePage ? 0 : 1,
    }}>
      <div className="px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex justify-between items-center h-16 overflow-visible">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span
              style={{ fontFamily: "var(--font-heading)" }}
              className={`text-lg sm:text-xl font-bold ${
                isHomePage ? "text-white" : "text-gray-800"
              }`}
            >
              Mestermind
            </span>
            <span className={`text-xs ml-[1px] ${
              isHomePage ? "text-white/70" : "text-gray-500"
            }`}>®</span>
          </Link>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center space-x-2">
            {isSignedIn && authToken && (
              <NotificationBell token={authToken} onDark={isHomePage} />
            )}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className={`p-2 ${
                  isHomePage ? "text-white hover:text-white/80" : ""
                }`}>
                  <LuMenu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 ">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {isSignedIn ? `Welcome, ${userName || 'User'}` : 'Menu'}
                  </SheetTitle>
                  <SheetDescription>
                    {isSignedIn ? userEmail : 'Menu'}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-2">
                  {/* User Info */}
                  {/* {isSignedIn && (
                    <div className="flex items-center space-x-3 pb-4 border-b">
                      <Avatar>
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt="Profile" />
                        ) : (
                          <AvatarFallback>{userInitials || "U"}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {userName || "User"}
                        </div>
                        {userEmail && (
                          <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                        )}
                      </div>
                    </div>
                  )} */}

                  {/* Navigation Links */}
                  <div className="space-y-2">

                    {/* Pro User Menu Items */}
                    {isSignedIn && isPro && (
                      <>
                        <Link href="/pro/leads" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Jobs
                          </Button>
                        </Link>
                        <Link href="/pro/messages" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Messages
                            {unreadCount > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </Button>
                        </Link>
                        <Link href="/pro/services" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Services
                          </Button>
                        </Link>
                        <Link href="/pro/calendar" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Calendar
                          </Button>
                        </Link>
                        <Link href="/pro/profile" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Profile
                          </Button>
                        </Link>
                      </>
                    )}

                    {/* Customer User Menu Items */}
                    {isSignedIn && !isPro && (
                      <>
                        <Link href="/tasks" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            My Requests
                          </Button>
                        </Link>
                        <Link href="/messages" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Messages
                            {unreadCount > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </Button>
                        </Link>
                      </>
                    )}

                    {/* Join as Pro */}
                    {!isPro && (
                      <Link href="/pro/onboarding" onClick={closeMobileMenu}>
                        <Button variant="ghost" className="w-full justify-start">
                          Join as a pro
                        </Button>
                      </Link>
                    )}

                    {/* Auth Buttons */}
                    {!isSignedIn && (
                      <>
                        <Link href="/login" onClick={closeMobileMenu}>
                          <Button variant="ghost" className="w-full justify-start">
                            Log in
                          </Button>
                        </Link>
                        <Link href="/signup" onClick={closeMobileMenu}>
                          <Button className="w-full">
                            Sign up
                          </Button>
                        </Link>
                      </>
                    )}

                    {/* Sign Out */}
                    {isSignedIn && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleSignOut}
                      >
                        <LuLogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-0">
            <div className="relative overflow-visible" ref={buttonRef}>
              <Popover open={isServicesDropdownOpen} onOpenChange={setIsServicesDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`z-40 font-semibold text-sm flex items-center ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Explore Services
                    <LuChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <ServicesPopover />
              </Popover>
            </div>
            {isSignedIn && isPro && (
              <>
                <Link href="/pro/leads">
                  <Button
                    variant="ghost"
                    className={`font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Jobs
                  </Button>
                </Link>
                <Link href="/pro/messages">
                  <Button
                    variant="ghost"
                    className={`relative font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/pro/services">
                  <Button
                    variant="ghost"
                    className={`font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Services
                  </Button>
                </Link>
                <Link href="/pro/calendar">
                  <Button
                    variant="ghost"
                    className={`font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Calendar
                  </Button>
                </Link>
                <Link href="/pro/profile">
                  <Button
                    variant="ghost"
                    className={`font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Profile
                  </Button>
                </Link>
              </>
            )}
            {isSignedIn && !isPro && (
              <>
                <Link href="/tasks">
                  <Button
                    variant="ghost"
                    className={`font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Requests
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant="ghost"
                    className={`relative font-normal text-sm ${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </>
            )}
            {!isPro && (
              <Link href="/pro/onboarding">
                <Button
                  variant="ghost"
                  className={`font-semibold text-sm ${
                    isHomePage 
                      ? "text-white hover:text-white/80" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Join as a pro
                </Button>
              </Link>
            )}
            {isSignedIn && authToken && (
              <div className="ml-2">
                <NotificationBell token={authToken} onDark={isHomePage} />
              </div>
            )}
            {isSignedIn && (
              <div className="ml-2 relative" ref={avatarRef}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full">
                      <Avatar>
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt="Profile" />
                        ) : (
                          <AvatarFallback>{userInitials || "U"}</AvatarFallback>
                        )}
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      <div className="font-medium text-gray-900 truncate">
                        {userName ? `Welcome, ${userName}` : "Welcome"}
                      </div>
                      {userEmail && (
                        <div className="text-gray-500 truncate">{userEmail}</div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700">
                      <LuLogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {!isSignedIn && (
              <>
                <Link href="/signup">
                  <Button className={`px-6 py-2 rounded-md ${
                    isHomePage 
                      ? "bg-white text-gray-900 hover:bg-white/90" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                    Sign up
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className={`${
                      isHomePage 
                        ? "text-white hover:text-white/80" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Log in
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
