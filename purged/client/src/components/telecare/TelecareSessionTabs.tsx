import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TelecareSessionTabsListProps = {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
};

const columnClass = {
  2: "grid-cols-2",
  3: "grid-cols-3",
} as const;

export function TelecareSessionTabsList({
  children,
  columns = 2,
  className,
}: TelecareSessionTabsListProps) {
  return (
    <div className={cn("tabs-list-custom shrink-0 mb-2 min-w-0", className)}>
      <TabsList
        className={cn(
          "grid w-full min-w-0 bg-transparent h-auto p-1 gap-1 sm:gap-2",
          columnClass[columns],
        )}
      >
        {children}
      </TabsList>
    </div>
  );
}

type TelecareSessionTabTriggerProps = ComponentPropsWithoutRef<typeof TabsTrigger>;

export function TelecareSessionTabTrigger({ className, ...props }: TelecareSessionTabTriggerProps) {
  return (
    <TabsTrigger
      className={cn(
        "tab-trigger-custom text-xs sm:text-sm gap-1.5 min-w-0 px-2 sm:px-3",
        className,
      )}
      {...props}
    />
  );
}
