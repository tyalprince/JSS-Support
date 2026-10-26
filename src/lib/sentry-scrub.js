// Sentry beforeSend hook: keep credentials and email addresses out of error
// reports. This app handles families' and children's data, so we err on the
// side of sending less.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const SENSITIVE_HEADERS = ['authorization', 'cookie']

export function redactEmails(value) {
  return typeof value === 'string' ? value.replace(EMAIL_RE, '[email]') : value
}

export function scrub(event) {
  const headers = event.request && event.request.headers
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) delete headers[key]
    }
  }
  if (event.request && event.request.cookies) delete event.request.cookies

  if (event.message) event.message = redactEmails(event.message)
  if (event.logentry && event.logentry.message) {
    event.logentry.message = redactEmails(event.logentry.message)
  }

  const values = event.exception && event.exception.values
  if (Array.isArray(values)) {
    for (const ex of values) {
      if (ex && ex.value) ex.value = redactEmails(ex.value)
    }
  }

  return event
}
