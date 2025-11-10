"use client";

import * as React from "react";
import { XIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "./input";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [openDropdown, setOpenDropdown] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<Set<string>>(
    new Set(defaultValue || []),
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(new Set(value));
    }
  }, [value]);

  const toggleValue = (optionValue: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(optionValue)) {
      newSelected.delete(optionValue);
    } else {
      newSelected.add(optionValue); // Switches selected selection
    }

    setSelectedValues(newSelected);
    onChange?.(Array.from(newSelected));
  };

  const removeValue = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedValues);
    newSelected.delete(optionValue);
    setSelectedValues(newSelected);
    onChange?.(Array.from(newSelected));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();

    setSelectedValues(new Set());
    onChange?.([]);
  };

  const selectedOptions = options.filter((opt) =>
    selectedValues.has(opt.value),
  );
  const availableOptions = options.filter(
    (opt) => !selectedValues.has(opt.value),
  );

  const [search, setSearch] = useState("");
  const filteredOptions = availableOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={openDropdown} onOpenChange={setOpenDropdown}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openDropdown}
          className={cn(
            "h-auto min-h-10 w-full justify-between p-2",
            !selectedValues.size && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selectedOptions.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => removeValue(option.value, e)}
                >
                  {option.label}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        removeValue(option.value, e as any);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => removeValue(option.value, e)}
                  >
                    <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="ml-2 flex items-center gap-1">
            {selectedValues.size > 0 && (
              <button
                onClick={clearAll}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="rounded-sm opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="max-h-60 overflow-auto">
          {availableOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="p-1">
              <Input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div>
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    )}
                    onClick={() => toggleValue(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        toggleValue(option.value);
                      }
                    }}
                    role="option"
                    aria-selected={selectedValues.has(option.value)}
                    tabIndex={0}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
