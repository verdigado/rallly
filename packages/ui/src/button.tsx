"use client";
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import * as React from "react";

import { cn } from "./lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal text-sm outline-none transition-opacity focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:opacity-90 active:shadow-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-[#FFF17A] hover:text-[#002216] focus:bg-[#FFF17A] focus:text-[#002216] focus-visible:shadow-[0_0_1px_2px_#0BA1DD] active:bg-[#FFF17A] active:text-[#002216] [&_svg]:fill-white [&_svg]:stroke-white hover:[&_svg]:fill-[#002216] hover:[&_svg]:stroke-[#002216] focus:[&_svg]:fill-[#002216] focus:[&_svg]:stroke-[#002216] active:[&_svg]:fill-[#002216] active:[&_svg]:stroke-[#002216]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        default:
          "border border-[#005437] bg-transparent text-[#005437] hover:bg-[#005437] hover:text-white focus:bg-[#005437] focus:text-white focus-visible:shadow-[0_0_1px_2px_#0BA1DD] active:bg-[#005437] active:text-white [&_svg]:fill-[#005437] [&_svg]:stroke-[#005437] hover:[&_svg]:fill-white hover:[&_svg]:stroke-white focus:[&_svg]:fill-white focus:[&_svg]:stroke-white active:[&_svg]:fill-white active:[&_svg]:stroke-white",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-accent data-[state=open]:bg-accent",
        actionBar:
          "border-transparent bg-action-bar text-action-bar-foreground hover:bg-action-bar-foreground/10 data-[state=open]:bg-action-bar-foreground/20",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        outline:
          "border border-[#00432c] bg-transparent text-white hover:border-white [&_svg]:fill-white [&_svg]:stroke-white",
      },
      size: {
        default: "h-8 gap-x-1.5 px-2 text-sm",
        sm: "h-7 gap-x-1.5 px-1.5 text-sm",
        md: "h-9 gap-x-2 px-2 text-sm",
        lg: "h-12 gap-x-3 px-4 text-base",
        icon: "size-7 gap-x-1.5 text-sm",
        "icon-lg": "size-8",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      loading,
      children,
      variant,
      type = "button",
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "group",
          buttonVariants({ variant, size }),
          {
            "pointer-events-none": loading,
          },
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      >
        {loading ? (
          <Loader2Icon className="size-4 animate-spin opacity-75" />
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
