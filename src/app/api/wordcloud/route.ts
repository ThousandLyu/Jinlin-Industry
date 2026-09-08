import { NextResponse } from 'next/server'
import { buildWordCloudData } from '@/lib/wordCloudData'

export async function GET() {
  try {
    const data = await buildWordCloudData()
    return NextResponse.json({
      success: true,
      words: data.words,
      maxWeight: data.maxWeight,
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
