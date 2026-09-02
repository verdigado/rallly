import { cva } from "class-variance-authority";

import { cn } from "./lib/utils";

export const buttonVariants = cva(
  cn(
    "group inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-normal transition-colors active:opacity-80 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-90",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-[#FFF17A] hover:text-[#002216] focus:bg-[#FFF17A] focus:text-[#002216] focus-visible:shadow-[0_0_1px_2px_#0BA1DD] active:bg-[#FFF17A] active:text-[#002216] [&_svg]:fill-white [&_svg]:stroke-white hover:[&_svg]:fill-[#002216] hover:[&_svg]:stroke-[#002216] focus:[&_svg]:fill-[#002216] focus:[&_svg]:stroke-[#002216] active:[&_svg]:fill-[#002216] active:[&_svg]:stroke-[#002216]",
        destructive:
          "bg-destructive text-destructive-foreground ring-1 ring-button-outline ring-inset hover:bg-destructive/90 dark:bg-destructive/80",
        default:
          "border border-[#005437] bg-transparent text-[#005437] hover:bg-[#005437] hover:text-white focus:bg-[#005437] focus:text-white focus-visible:shadow-[0_0_1px_2px_#0BA1DD] active:bg-[#005437] active:text-white [&_svg]:fill-[#005437] [&_svg]:stroke-[#005437] hover:[&_svg]:fill-white hover:[&_svg]:stroke-white focus:[&_svg]:fill-white focus:[&_svg]:stroke-white active:[&_svg]:fill-white active:[&_svg]:stroke-white",
        ghost:
          "border-transparent bg-transparent text-foreground ring-1 ring-transparent ring-inset hover:bg-accent data-[state=open]:bg-accent [&>svg]:opacity-75",
        actionBar:
          "border-transparent bg-action-bar text-action-bar-foreground hover:bg-action-bar-foreground/10 data-[state=open]:bg-action-bar-foreground/20",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        outline:
          "border border-[#00432c] bg-transparent text-white hover:border-white [&_svg]:fill-white [&_svg]:stroke-white",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 in-data-[slot=button-group]:rounded-lg px-2 text-sm text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 in-data-[slot=button-group]:rounded-lg px-2.5 text-[0.8rem] text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xl: "h-12 gap-2 px-4 text-base has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-xs":
          "size-6 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
