'use client'
import { useState } from 'react'
import MediaPicker from './MediaPicker'
import SmartImage from '@/components/shared/SmartImage'

interface MediaPickerFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']

function isImageUrl(url: string): boolean {
  if (!url) return false
  const ext = url.toLowerCase().slice(url.lastIndexOf('.'))
  return IMAGE_EXTS.some(e => ext.startsWith(e))
}

export default function MediaPickerField({ label, value, onChange, placeholder }: MediaPickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-start gap-2">
        {isImageUrl(value) && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-[#E8DCC8] bg-[#F5F0E8]">
            <SmartImage
              src={value}
              alt="预览"
              fill
              sizes="40px"
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={value}
            placeholder={placeholder || '点击浏览选择或直接输入路径'}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-[#E8DCC8] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]"
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-3 py-2 border border-[#C49A2B] text-[#C49A2B] rounded-lg text-sm hover:bg-[#C49A2B]/10 whitespace-nowrap"
          >
            浏览
          </button>
        </div>
      </div>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
      />
    </div>
  )
}
