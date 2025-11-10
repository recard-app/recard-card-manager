import * as React from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog"

interface DialogWrapperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title: string
  description?: string
}

export function DialogWrapper({
  open,
  onOpenChange,
  children,
  title,
  description,
}: DialogWrapperProps) {
  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </ShadcnDialog>
  )
}
