"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "relative text-sm",
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-between",
        button_previous:
          "absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center border border-border bg-background hover:bg-accent",
        button_next:
          "absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center border border-border bg-background hover:bg-accent",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center app-radius-md hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected:
          "bg-primary text-primary-foreground app-radius-md hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", chevronClassName)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  );
}
