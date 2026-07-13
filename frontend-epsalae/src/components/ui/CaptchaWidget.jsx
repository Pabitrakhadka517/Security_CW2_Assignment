import { forwardRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const CaptchaWidget = forwardRef(function CaptchaWidget({ onVerify, onExpire }, ref) {
  return (
    <HCaptcha
      ref={ref}
      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
      onVerify={onVerify}
      onExpire={onExpire}
      onError={() => onExpire()}
      theme="light"
    />
  )
})

export default CaptchaWidget
