import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap app-radius-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none ring-0 select-none",
  {
    variants: {
      variant: {
        default:
          "variant-default | relative bg-primary text-primary-foreground shadow-[inset_0_3px_4px_0_hsl(var(--border)/0.5),inset_0_-2px_4px_2px_rgba(0,0,0,0.4)] hover:brightness-110 disabled:active:scale-100 duration-150",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border text-muted-foreground bg-background hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: " hover:bg-border hover:text-foreground",
        Trigger:
          "bg-none text-foreground/70 hover:text-foreground !outline-none !ring-0 focus:!outline-none focus:!ring-0",
        link: "text-primary underline-offset-4 hover:underline",
        SidebarMenuButton:
          "flex justify-start items-center gap-2 bg-none w-full text-foreground hover:bg-border",
        SidebarMenuButton_destructive:
          "flex justify-start items-center gap-2 bg-none w-full text-muted-foreground hover:bg-border hover:text-destructive",
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
