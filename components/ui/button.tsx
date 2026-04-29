import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap app-radius-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none ring-0",
  {
    // transition-all duration-300 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:rounded-md hover:shadow-[4px_4px_0px_black] active:translate-x-[0px] active:translate-y-[0px] active:rounded-2xl active:shadow-none
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground transition-all duration-300 border-r border-b border-transparent hover:border-muted/50 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:rounded-tl-lg hover:shadow-[3px_3px_0px] hover:shadow-primary active:translate-x-[0px] active:translate-y-[0px]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border/80 text-muted-foreground bg-background hover:bg-muted hover:border-border",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: " hover:bg-border hover:text-foreground",
        Trigger: "bg-none text-foreground/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        SidebarMenuButton:
          "flex justify-start items-center gap-2 bg-none w-full text-foreground hover:bg-border",
        SidebarMenuButton_destructive:
          "flex justify-start items-center gap-2 bg-none w-full text-foreground hover:bg-border hover:text-destructive",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 app-radius-lg px-3",
        lg: "h-11 app-radius-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
