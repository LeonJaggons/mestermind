"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function MessagesSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (path: string) => {
    if (path === "/pro/messages") {
      return pathname === "/pro/messages";
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="bg-white w-60 h-full p-4 lg:p-5 ">
      <div>
        {/* Folders Section */}
        <div className="text-xs font-semibold text-gray-700 mb-2">{t("pro.messages.sidebar.folders")}</div>
        <div className="space-y-1">
          <Link
            href="/pro/messages"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages") && pathname === "/pro/messages"
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.667 9.667a.667.667 0 010-1.334h4a.667.667 0 110 1.334h-4zm0-3.167C5.299 6.5 5 6.164 5 5.75S5.3 5 5.667 5h6.667c.368 0 .666.336.666.75s-.298.75-.666.75H5.667zm.346 7.167l2.466 3.083a.667.667 0 001.042 0l2.466-3.083H15a2 2 0 002-2V3a2 2 0 00-2-2H3a2 2 0 00-2 2v8.667a2 2 0 002 2h3.013z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.messages")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/unread"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/unread")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 15H3v-4h2.571A3.578 3.578 0 009 13.571 3.578 3.578 0 0012.429 11H15v4zm-.883-12l.75 6h-4.296v1c0 .866-.705 1.571-1.571 1.571A1.573 1.573 0 017.429 10V9H3.133l.75-6h10.234zm1.766-2H2.117L1.008 9.876 1 15c0 1.103.897 2 2 2h12c1.104 0 2-.897 2-2v-5l-1.117-9z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.unread")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/archived"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/archived")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5H3V4c0-.551.449-1 1-1h10c.551 0 1 .449 1 1v1zm0 9c0 .551-.449 1-1 1H4c-.551 0-1-.449-1-1V7h12v7zM14 1H4C2.346 1 1 2.346 1 4v10c0 1.654 1.346 3 3 3h10c1.654 0 3-1.346 3-3V4c0-1.654-1.346-3-3-3zm-7 9.75h4a.75.75 0 000-1.5H7a.75.75 0 000 1.5z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.archived")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/sent"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/sent")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.19 14.659L4.351 10h7.757l-8.92 4.659zM12.11 8H4.351L3.19 3.34 12.11 8zm4.267-.027L3.387 1.187a1.608 1.608 0 00-1.762.163 1.615 1.615 0 00-.577 1.678L2.542 9l-1.494 5.971a1.615 1.615 0 00.577 1.678 1.608 1.608 0 001.76.163l12.992-6.786a1.154 1.154 0 000-2.053z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.sentQuotes")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/starred"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/starred")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.456 1.322l1.714 4.985 5.353.061c.461.005.652.582.282.852l-4.295 3.142 1.595 5.022c.137.432-.361.789-.737.527L9 12.867 4.632 15.91c-.375.262-.874-.095-.737-.526L5.49 10.36 1.195 7.22c-.37-.27-.179-.847.282-.853l5.353-.06L8.544 1.32c.148-.428.765-.428.912.001zm-1.55 6.472l-3.333.038 2.673 1.955-1.009 3.177L9 11.04l2.763 1.925-1.01-3.176 2.674-1.955-3.332-.038L9 4.609 7.905 7.794z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.starred")}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Job Status Filters Section */}
      <div className="my-3">
        <hr className="border-gray-300" />
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-700 mb-2">{t("pro.messages.sidebar.jobStatusFilters")}</div>
        <div className="space-y-1">
          <Link
            href="/pro/messages/no-status"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/no-status")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.notScheduledYet")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/status-hired"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/status-hired")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.scheduled")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/status-done"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/status-done")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.jobDone")}</div>
            </div>
          </Link>

          <Link
            href="/pro/messages/status-lost"
            className={`flex items-center rounded px-2 py-2 text-sm ${
              isActive("/pro/messages/status-lost")
                ? "font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center pr-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate">{t("pro.messages.sidebar.noHire")}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mb-3 mt-4">
        <hr className="border-gray-300" />
      </div>

      <div className="flex flex-col space-y-3">
        <div className="p-2">
          <Link
            href="/pro/calendar"
            className="inline-block mb-2"
          >
            <svg className="text-black" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1a1 1 0 011 1v1h2c1.104 0 2 .897 2 2v10c0 1.103-.896 2-2 2H3c-1.103 0-2-.897-2-2V5c0-1.103.897-2 2-2h2V2a1 1 0 112 0v1h4V2a1 1 0 011-1zm3 8H3v6h12.001L15 9zm0-4H3v2h12V5zm-3 5.5c-.827 0-1.5.673-1.5 1.5s.673 1.5 1.5 1.5 1.5-.673 1.5-1.5-.673-1.5-1.5-1.5z"></path>
            </svg>
          </Link>
          <p className="text-sm text-gray-600">
            {t("pro.messages.sidebar.reviewAvailability")}{" "}
            <Link href="/pro/calendar" className="text-[hsl(var(--primary))] hover:underline">
              {t("pro.messages.sidebar.tellUsBusy")}
            </Link>
          </p>
        </div>

        <div className="p-2">
          <Link
            href="/pro/calendar/manage-external-calendars"
            className="inline-block mb-2"
          >
            <svg className="text-black" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.429 1.929a1 1 0 10-2 0v2.857H3.857a1 1 0 00-1 1V9A6.145 6.145 0 008 15.062v1.01a1 1 0 102 0v-1.01A6.145 6.145 0 0015.143 9V5.786a1 1 0 00-1-1H12.57V1.929a1 1 0 10-2 0v2.857H7.43V1.929zM9 13.143A4.143 4.143 0 014.857 9V6.786h8.286V9A4.143 4.143 0 019 13.143z" fillRule="evenodd"></path>
            </svg>
          </Link>
          <p className="text-sm text-gray-600">
            <Link href="/pro/calendar/manage-external-calendars" className="text-[hsl(var(--primary))] hover:underline">
              {t("pro.messages.sidebar.connectTools")}
            </Link>
            {" "}{t("pro.messages.sidebar.streamlineWorkflows")}
          </p>
        </div>
      </div>
    </nav>
  );
}
