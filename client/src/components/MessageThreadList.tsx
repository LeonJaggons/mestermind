import { useMemo } from "react";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MessageThread } from "@/lib/api";

interface MessageThreadListProps {
  threads: MessageThread[];
  selectedThreadId: string | null;
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  basePath: string; // "/messages" or "/pro/messages"
  emptyMessage?: string;
  renderThreadAvatar?: (thread: MessageThread, isSelected: boolean) => React.ReactNode;
}

export default function MessageThreadList({
  threads,
  selectedThreadId,
  loading,
  searchValue,
  onSearchChange,
  basePath,
  emptyMessage = "No conversations yet.",
  renderThreadAvatar,
}: MessageThreadListProps) {
  const router = useRouter();

  const filteredThreads = useMemo(() => {
    if (!searchValue.trim()) return threads;
    const q = searchValue.toLowerCase();
    return threads.filter((t) =>
      (t.last_message_preview || "").toLowerCase().includes(q)
    );
  }, [threads, searchValue]);

  const handleThreadClick = (threadId: string) => {
    router.push(`${basePath}/${threadId}`, undefined, { shallow: true });
  };

  return (
    <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-l border-gray-200 flex flex-col bg-white min-h-0">
      {/* Search */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations"
            className="pl-9"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="p-4 text-sm text-gray-500">Loading…</div>
        )}
        {!loading && filteredThreads.length === 0 && (
          <div className="p-6 text-sm text-gray-500">{emptyMessage}</div>
        )}
        {!loading &&
          filteredThreads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            return (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  isSelected ? "bg-gray-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {renderThreadAvatar && renderThreadAvatar(thread, isSelected)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900 truncate">
                      {thread.last_message_preview || "New conversation"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {thread.last_message_at
                        ? new Date(thread.last_message_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

