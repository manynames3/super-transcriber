import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        sm: "h-9 px-4 text-sm",
      },
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_36px_rgba(212,168,67,0.18)] hover:-translate-y-0.5 hover:bg-[#e0b34e]",
        ghost: "bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
        outline:
          "border border-white/15 bg-[rgba(255,255,255,0.02)] text-foreground hover:bg-white/6 hover:border-white/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[rgba(255,255,255,0.1)]",
      },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      ref={ref}
      {...props}
    />
  ),
);

Button.displayName = "Button";
