export function useFormat() {
  const number = (value?: string | number | null) =>
    new Intl.NumberFormat('fa-IR').format(Number(value ?? 0))

  const money = (value?: string | number | null, currency = 'تومان') =>
    `${number(value)} ${currency === 'TOMAN' ? 'تومان' : currency === 'IRR' ? 'ریال' : currency}`

  const date = (value?: string | Date | null) => value
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
    : '—'

  const dateTime = (value?: string | Date | null) => value
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—'

  const errorMessage = (error: any) => {
    const message = error?.data?.message
    return Array.isArray(message) ? message[0] : message || 'خطایی رخ داد؛ دوباره تلاش کنید.'
  }

  return { number, money, date, dateTime, errorMessage }
}
