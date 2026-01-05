"use client"

import { useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import { categoriesApi, CategoryWithServices } from "@/lib/api/categories"
import { useI18n } from "@/lib/contexts/I18nContext"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ServicesDropdownProps {
  children: React.ReactNode
}

export function ServicesDropdown({ children }: ServicesDropdownProps) {
  const { language } = useI18n()
  const [categories, setCategories] = useState<CategoryWithServices[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithServices | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.getAllWithServices(0, 100, language)
        setCategories(data)
        if (data.length > 0) {
          setSelectedCategory(data[0])
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchCategories()
    }
  }, [open, language])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-[9998]"
          style={{ top: '64px' }}
          onClick={() => setOpen(false)}
        />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent
          className="w-[587px] p-0 border-0 shadow-3xl z-9999 bg-white"
          align="start"
          sideOffset={1}
        >
        <div className="flex" style={{ height: "461px" }}>
          {/* Categories Sidebar */}
          <div
            className="border-r border-gray-200 overflow-y-auto shadow-[4px_0_6px_-1px_rgba(0,0,0,0.1)]"
            style={{ width: "300px", paddingTop: "16px" }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <div>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onMouseEnter={() => setSelectedCategory(category)}
                    onClick={() => {
                      window.location.href = `/services/${category.slug}`
                      setOpen(false)
                    }}
                    className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${
                      selectedCategory?.id === category.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Services List */}
          <div
            className="overflow-y-auto p-4"
            style={{ width: "287px" }}
          >
            {selectedCategory && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedCategory.name}
                </h3>
                <div className="space-y-1">
                  {selectedCategory.services.map((service) => (
                    <a
                      key={service.id}
                      href={`/services/${selectedCategory.slug}/${service.slug}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {service.name}
                    </a>
                  ))}
                  {selectedCategory.services.length === 0 && (
                    <p className="text-sm text-gray-500 px-4 py-2">
                      No services available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
    </>
  )
}
