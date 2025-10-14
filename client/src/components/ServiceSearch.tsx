"use client";

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchServices, Service } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

interface ServiceSearchProps {
  onSelect: (service: Service) => void;
  selectedService?: Service | null;
  onClearSelected?: () => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export default function ServiceSearch({
  onSelect,
  selectedService = null,
  onClearSelected,
  placeholder = "Describe your project or problem — be as detailed as you'd like.",
  className = "",
  compact = false,
}: ServiceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // keep input in sync with confirmed selection
  useEffect(() => {
    if (selectedService) {
      setQuery(selectedService.name);
    }
  }, [selectedService]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchServices(query);
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
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", compact ? "h-full" : "", className)}>
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
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            placeholder={placeholder}
            className={cn(
              "border-0 w-full focus-visible:ring-0 text-gray-800",
              compact ? "h-full py-2 px-3 text-sm" : "py-4 sm:py-6 px-4 sm:px-6 h-full"
            )}
            aria-autocomplete="list"
            role="combobox"
            style={{ fontSize: "16px" }}
            aria-expanded={open}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading && (
              <CommandEmpty>Searching…</CommandEmpty>
            )}
            {!loading && results.length === 0 && query.length >= 2 && (
              <CommandEmpty>No services found</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup>
                {results.map((svc) => (
                  <CommandItem
                    key={svc.id}
                    value={svc.id.toString()}
                    onSelect={() => {
                      onSelect(svc);
                      setQuery(svc.name);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium">{svc.name}</div>
                      {svc.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {svc.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
