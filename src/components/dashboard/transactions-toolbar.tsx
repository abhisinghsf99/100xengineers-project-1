"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, ArrowUpDown, Check } from "lucide-react"
import type { SortOption } from "@/lib/transaction-filters"

interface TransactionsToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onFilterClick: () => void
  activeFilterCount: number
  sortOption: SortOption
  onSortChange: (sort: SortOption) => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date (newest)" },
  { value: "date-asc", label: "Date (oldest)" },
  { value: "amount-desc", label: "Amount (high to low)" },
  { value: "amount-asc", label: "Amount (low to high)" },
  { value: "merchant-asc", label: "Merchant (A-Z)" },
]

export function TransactionsToolbar({
  searchValue,
  onSearchChange,
  onFilterClick,
  activeFilterCount,
  sortOption,
  onSortChange,
}: TransactionsToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-8"
        />
      </div>

      {/* Filter button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onFilterClick}
        className="shrink-0 gap-1.5"
      >
        <Filter className="h-4 w-4" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-cyan-600 text-white text-xs font-medium">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-transparent px-3 h-8 text-sm font-medium whitespace-nowrap hover:bg-accent hover:text-accent-foreground shrink-0"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className="gap-2"
            >
              {sortOption === option.value && (
                <Check className="h-4 w-4 text-cyan-500" />
              )}
              {sortOption !== option.value && <span className="w-4" />}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
