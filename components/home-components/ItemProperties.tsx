"use client";

import {
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  CircleOff,
  Equal,
  Flag,
  Signal,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ItemStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "completed"
  | "canceled";
export type ItemPriority = "no_priority" | "urgent" | "high" | "medium" | "low";

type Properties = {
  status?: string;
  priority?: string;
  deadline?: number;
  onChange: (changes: {
    status?: ItemStatus;
    priority?: ItemPriority;
    deadline?: number | null;
  }) => void;
};

const statuses: Array<{ value: ItemStatus; label: string; Icon: any }> = [
  { value: "backlog", label: "Backlog", Icon: CircleOff },
  { value: "planned", label: "Planned", Icon: Circle },
  { value: "in_progress", label: "In progress", Icon: CircleDot },
  { value: "completed", label: "Completed", Icon: Check },
  { value: "canceled", label: "Canceled", Icon: XCircle },
];

const priorities: Array<{ value: ItemPriority; label: string; Icon: any }> = [
  { value: "no_priority", label: "No priority", Icon: Equal },
  { value: "urgent", label: "Urgent", Icon: Flag },
  { value: "high", label: "High", Icon: Signal },
  { value: "medium", label: "Medium", Icon: Signal },
  { value: "low", label: "Low", Icon: Signal },
];

const statusFor = (value?: string) =>
  statuses.find((item) => item.value === value) ?? statuses[0];
const priorityFor = (value?: string) =>
  priorities.find((item) => item.value === value) ?? priorities[0];

function DeadlinePicker({
  deadline,
  onChange,
  compact = false,
  onOpenChange,
}: Pick<Properties, "deadline" | "onChange"> & {
  compact?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const timeInputId = useId();
  const selectedDate = deadline ? new Date(deadline) : undefined;
  const label = selectedDate
    ? format(selectedDate, "MMM d, h:mm a")
    : "Set deadline";
  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  const setDate = (date?: Date) => {
    if (!date) return;
    const current = selectedDate ?? new Date();
    date.setHours(current.getHours(), current.getMinutes(), 0, 0);
    onChange({ deadline: date.getTime() });
  };
  const setTime = (time: string) => {
    if (!time) return;
    const [hours, minutes] = time.split(":").map(Number);
    const next = selectedDate ?? new Date();
    next.setHours(hours, minutes, 0, 0);
    onChange({ deadline: next.getTime() });
  };
  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          variant={compact ? "outline" : "SidebarMenuButton"}
          className={cn(
            "h-7 justify-start gap-2 px-2 text-sm",
            compact && "border-border bg-background",
          )}
        >
          <CalendarDays size={14} className="text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 z-20">
        <div className="space-y-3 p-3 pb-0">
          <Label>Deadline</Label>
          <p className="text-sm text-muted-foreground">
            {selectedDate
              ? format(selectedDate, "PPP 'at' p")
              : "Choose a date and time"}
          </p>
        </div>
        <Calendar mode="single" selected={selectedDate} onSelect={setDate} />
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Label
            htmlFor={timeInputId}
            className="text-xs text-muted-foreground"
          >
            Time
          </Label>
          <Input
            id={timeInputId}
            type="time"
            value={selectedDate ? format(selectedDate, "HH:mm") : ""}
            onChange={(event) => setTime(event.target.value)}
            className="h-8 w-28"
          />
        </div>
        {deadline ? (
          <Button
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => onChange({ deadline: null })}
          >
            Clear deadline
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function ItemPropertiesMenu({
  status,
  priority,
  deadline,
  onChange,
}: Properties) {
  const currentStatus = statusFor(status);
  const currentPriority = priorityFor(priority);
  return (
    <div className="space-y-1">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="h-8 gap-2 px-2 text-sm">
          <currentStatus.Icon
            size={14}
            className="shrink-0 text-muted-foreground"
          />
          <span className="truncate">State: {currentStatus.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          {statuses.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onChange({ status: value })}
              className="gap-2"
            >
              <Icon size={14} />
              {label}
              {statusFor(status).value === value ? (
                <Check className="ml-auto h-3.5 w-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="h-8 gap-2 px-2 text-sm">
          <currentPriority.Icon
            size={14}
            className="shrink-0 text-muted-foreground"
          />
          <span className="truncate">Priority: {currentPriority.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          {priorities.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onChange({ priority: value })}
              className="gap-2"
            >
              <Icon size={14} />
              {label}
              {priorityFor(priority).value === value ? (
                <Check className="ml-auto h-3.5 w-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <div className="px-1">
        <DeadlinePicker deadline={deadline} onChange={onChange} />
      </div>
    </div>
  );
}

export function ItemPropertiesBadges({
  status,
  priority,
  deadline,
}: {
  status?: string;
  priority?: string;
  deadline?: number;
}) {
  const badges: React.ReactNode[] = [];

  if (status && status !== "backlog") {
    const s = statuses.find((x) => x.value === status);
    if (s) {
      const Icon = s.Icon;
      badges.push(
        <span
          key="status"
          className="inline-flex items-center gap-1 app-radius-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          <Icon size={10} className="shrink-0" />
          <span className="truncate">{s.label}</span>
        </span>,
      );
    }
  }

  if (priority && priority !== "no_priority") {
    const p = priorities.find((x) => x.value === priority);
    if (p) {
      const Icon = p.Icon;
      badges.push(
        <span
          key="priority"
          className="inline-flex items-center gap-1 app-radius-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          <Icon size={10} className="shrink-0" />
          <span className="truncate">{p.label}</span>
        </span>,
      );
    }
  }

  if (deadline) {
    badges.push(
      <span
        key="deadline"
        className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
      >
        <CalendarDays size={10} className="shrink-0" />
        <span className="truncate">{format(new Date(deadline), "MMM d")}</span>
      </span>,
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap items-center gap-1">{badges}</div>;
}

export function ItemPropertiesHoverControls({
  status,
  priority,
  deadline,
  onChange,
}: Properties) {
  const currentStatus = statusFor(status);
  const currentPriority = priorityFor(priority);
  const [stateOpen, setStateOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
        (stateOpen || priorityOpen || deadlineOpen) && "opacity-100",
      )}
    >
      <Popover open={stateOpen} onOpenChange={setStateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-7 gap-1 border-border bg-background px-2 text-xs"
          >
            <currentStatus.Icon size={13} />
            {currentStatus.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 space-y-1 p-1">
          {statuses.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant="ghost"
              className="h-8 w-full justify-start gap-2 px-2 text-sm"
              onClick={() => onChange({ status: value })}
            >
              <Icon size={14} />
              {label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-7 gap-1 border-border bg-background px-2 text-xs"
          >
            <currentPriority.Icon size={13} />
            {currentPriority.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 space-y-1 p-1">
          {priorities.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant="ghost"
              className="h-8 w-full justify-start gap-2 px-2 text-sm"
              onClick={() => onChange({ priority: value })}
            >
              <Icon size={14} />
              {label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
      <DeadlinePicker
        deadline={deadline}
        onChange={onChange}
        compact
        onOpenChange={setDeadlineOpen}
      />
    </div>
  );
}
