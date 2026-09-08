import { redirect } from 'next/navigation'

export default function AdminAiTokensRedirectPage() {
  redirect('/admin/dashboard#ai-tokens')
}
