import * as React from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog"

interface DialogWrapperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  header?: React.ReactNode
}

// Helper function to recursively find DialogFooter
function findDialogFooter(children: React.ReactNode): { footer: React.ReactNode; otherChildren: React.ReactNode[] } {
  let footer: React.ReactNode = null
  const otherChildren: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      // Check if this is DialogFooter
      if (child.type === DialogFooter) {
        footer = child
      }
      // If it's a form or other container, search its children
      else if (child.props && child.props.children) {
        const result = findDialogFooter(child.props.children)
        if (result.footer && !footer) {
          footer = result.footer
          // Clone the element without the footer
          otherChildren.push(
            React.cloneElement(child, {
              ...child.props,
              children: result.otherChildren,
            })
          )
        } else {
          otherChildren.push(child)
        }
      } else {
        otherChildren.push(child)
      }
    } else {
      otherChildren.push(child)
    }
  })

  return { footer, otherChildren }
}

export function DialogWrapper({
  open,
  onOpenChange,
  children,
  title,
  description,
  header,
}: DialogWrapperProps) {
  // Recursively find and extract footer
  const { footer: footerChild, otherChildren: contentChildren } = findDialogFooter(children)

  const hasFooter = !!footerChild
  const hasHeader = !!(title || description || header)

  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-h-[90vh]">
        {hasHeader && (
          <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-gray-200">
            {header ? (
              header
            ) : (
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </DialogHeader>
            )}
          </div>
        )}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {contentChildren}
        </div>
        {hasFooter && (
          <div className="px-6 pb-6 flex-shrink-0">
            {footerChild}
          </div>
        )}
      </DialogContent>
    </ShadcnDialog>
  )
}

export { DialogFooter }
