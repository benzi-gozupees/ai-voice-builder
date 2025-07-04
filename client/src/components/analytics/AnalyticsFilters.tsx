import { useState } from "react";
import { Calendar, ChevronDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";

export interface AnalyticsFiltersProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange
}: AnalyticsFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to
  });

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range) {
      setTempDateRange(range);
      // Allow partial selection (just start date) and complete selection
      if (range.from) {
        if (range.to) {
          // Complete range selected
          onDateRangeChange({ from: range.from, to: range.to });
          setCalendarOpen(false);
        } else {
          // Only start date selected, keep calendar open for end date
          setTempDateRange({ from: range.from, to: undefined });
        }
      }
    }
  };

  const handleQuickSelect = (days: number) => {
    const to = new Date();
    const from = subDays(to, days - 1);
    onDateRangeChange({ from, to });
    setCalendarOpen(false);
  };

  const handleGroupSelect = (period: 'week' | 'month') => {
    const today = new Date();
    let from: Date, to: Date;
    
    if (period === 'week') {
      from = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
      to = endOfWeek(today, { weekStartsOn: 1 });
    } else {
      from = startOfMonth(today);
      to = endOfMonth(today);
    }
    
    onDateRangeChange({ from, to });
    setCalendarOpen(false);
  };

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, "MMM dd, yyyy");
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return "Select date range";
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Date Range Picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[260px] justify-start text-left font-normal"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {formatDateRange()}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(7)}
                className="text-xs"
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(30)}
                className="text-xs"
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGroupSelect('week')}
                className="text-xs"
              >
                This week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGroupSelect('month')}
                className="text-xs"
              >
                This month
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-center">Start Date</h4>
              <CalendarComponent
                mode="single"
                selected={tempDateRange?.from}
                onSelect={(date) => {
                  if (date) {
                    const newRange = { from: date, to: tempDateRange?.to };
                    setTempDateRange(newRange);
                    if (newRange.to) {
                      onDateRangeChange({ from: date, to: newRange.to });
                      setCalendarOpen(false);
                    }
                  }
                }}
                className="border-0"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 text-center">End Date</h4>
              <CalendarComponent
                mode="single"
                selected={tempDateRange?.to}
                onSelect={(date) => {
                  if (date && tempDateRange?.from) {
                    const newRange = { from: tempDateRange.from, to: date };
                    setTempDateRange(newRange);
                    onDateRangeChange({ from: tempDateRange.from, to: date });
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => !tempDateRange?.from || date < tempDateRange.from}
                className="border-0"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>


    </div>
  );
}