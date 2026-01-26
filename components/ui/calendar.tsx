import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "react-day-picker/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Crear locale personalizado con días en mayúsculas
const esLocaleUppercase = {
  ...es,
  localize: {
    ...es.localize,
    weekday: (n: number, options?: { width?: 'narrow' | 'short' | 'long' | 'abbreviated' }) => {
      const weekday = (es.localize as any).weekday?.(n, options) || '';
      return typeof weekday === 'string' ? weekday.toUpperCase() : weekday;
    },
  },
} as typeof es;

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = esLocaleUppercase,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4 px-10",
        caption_label: "text-sm font-medium text-center absolute left-1/2 -translate-x-1/2",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-2 top-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-2 top-1"
        ),
        table: "w-full border-collapse table-fixed",
        weekdays: "w-full",
        weekday:
          "text-muted-foreground rounded-md h-9 font-normal text-[0.8rem] uppercase text-center p-0 m-0 box-border",
        row: "w-full mt-2",
        cell: "h-9 flex-[0_0_calc(100%/7)] w-[calc(100%/7)] max-w-[calc(100%/7)] min-w-0 text-center text-sm p-0 m-0 relative flex items-center justify-center flex-shrink-0 flex-grow-0 box-border [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none aria-selected:opacity-100 cursor-pointer",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "cursor-not-allowed !bg-gray-100 !text-gray-400 !border !border-gray-200 hover:!bg-gray-100 hover:!text-gray-400",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
