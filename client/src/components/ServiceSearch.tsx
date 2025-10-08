"use client";

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchServices, Service } from '@/lib/api';

interface ServiceSearchProps {
  onSelect: (service: Service) => void;
  selectedService?: Service | null;
  onClearSelected?: () => void;
  placeholder?: string;
  className?: string;
}

export default function ServiceSearch({
  onSelect,
  selectedService = null,
  onClearSelected,
  placeholder = "Describe your project or problem — be as detailed as you'd like.",
  className = "",
}: ServiceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debouncedQuery = useDebounce(query, 200);

  // keep input in sync with confirmed selection
  useEffect(() => {
    if (selectedService) {
      setQuery(selectedService.name);
    }
  }, [selectedService]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchServices(debouncedQuery);
        if (active) setResults(data.slice(0, 8));
      } catch (_) {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Input
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (selectedService && next !== selectedService.name) {
            onClearSelected?.();
          }
        }}
        placeholder={placeholder}
        className="border-0 w-[600px] focus-visible:ring-0 text-gray-800 py-6 px-6 h-full"
        aria-autocomplete="list"
        role="combobox"
        style={{ fontSize: "16px" }}
        aria-expanded={open}
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-md">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}
          {!loading &&
            results.map((svc) => (
              <button
                key={svc.id}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700"
                onClick={() => {
                  onSelect(svc);
                  setQuery(svc.name);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{svc.name}</div>
                {svc.description && (
                  <div className="text-sm text-gray-500 line-clamp-1">
                    {svc.description}
                  </div>
                )}
              </button>
            ))}
          {!loading && results.length === 0 && debouncedQuery && (
            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
