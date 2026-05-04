'use client';

import React from "react"
import { cn } from "@/lib/utils"

interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

const Sidebar: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => {
  const { isOpen } = useSidebar()

  if (!isOpen) return null

  return (
    <div className={cn("w-64 bg-white border-r border-gray-200 flex flex-col", className)}>
      {children}
    </div>
  )
}

const SidebarHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("p-4 border-b border-gray-200", className)}>
    {children}
  </div>
)

const SidebarContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("flex-1 overflow-y-auto p-4", className)}>
    {children}
  </div>
)

const SidebarMenu: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("space-y-1", className)}>
    {children}
  </div>
)

const SidebarMenuItem: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("", className)}>
    {children}
  </div>
)

const SidebarMenuButton: React.FC<{
  asChild?: boolean
  className?: string
  children: React.ReactNode
}> = ({ asChild = false, className, children }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors",
        className
      )
    })
  }

  return (
    <button className={cn(
      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors w-full text-left",
      className
    )}>
      {children}
    </button>
  )
}

const SidebarMenuSub: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("ml-6 mt-1 space-y-1", className)}>
    {children}
  </div>
)

const SidebarMenuSubItem: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={cn("", className)}>
    {children}
  </div>
)

const SidebarMenuSubButton: React.FC<{
  asChild?: boolean
  className?: string
  children: React.ReactNode
}> = ({ asChild = false, className, children }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors",
        className
      )
    })
  }

  return (
    <button className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors w-full text-left",
      className
    )}>
      {children}
    </button>
  )
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
}
