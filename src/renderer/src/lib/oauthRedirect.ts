export function getOAuthRedirectUri() {
  if (window.api?.getOAuthRedirectUri) return window.api.getOAuthRedirectUri()

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin
  }

  return 'astra://login-callback'
}
