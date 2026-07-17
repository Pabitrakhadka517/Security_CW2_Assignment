import { Search } from 'lucide-react'
import ErrorPage from '@/components/ui/ErrorPage'

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      icon={Search}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      redirectSeconds={8}
    />
  )
}
