'use client'

import Image, { type ImageProps } from 'next/image'

type SmartImageProps = Omit<ImageProps, 'unoptimized' | 'loader'> & {
  unoptimized?: boolean
}

function isExternal(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith('//')
}

export default function SmartImage({ src, alt, unoptimized, ...rest }: SmartImageProps) {
  const srcStr = typeof src === 'string' ? src : ''
  const external = isExternal(srcStr)
  const shouldUnoptimize = unoptimized ?? external

  if (shouldUnoptimize) {
    return (
      <Image
        {...rest}
        src={src}
        alt={alt}
        loader={({ src: s }) => s}
        unoptimized
      />
    )
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      placeholder="empty"
    />
  )
}
