import { ShieldAlert } from 'lucide-react'
import ErrorPage from '@/components/ui/ErrorPage'

export default function Forbidden() {
  return (
    <ErrorPage
      code="403"
      icon={ShieldAlert}
      title="Access denied"
      description="You don't have permission to view this page."
    />
  )
}
