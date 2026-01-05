import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-3 cursor-pointer py-3">
        <input
          type="checkbox"
          className={cn(
            "peer h-5 w-5 shrink-0 rounded border border-gray-300 cursor-pointer",
            "checked:bg-[hsl(var(--primary))] checked:border-[hsl(var(--primary))]",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </span>
        )}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
