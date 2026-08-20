import type { BusinessDay, Time } from 'lightweight-charts'

function isBusinessDay(time: Time): time is BusinessDay {
  return typeof time === 'object'
}

export function createChartTimeFormatter(
  timeZone?: string,
): (time: Time) => string {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  })

  return (time) => {
    if (typeof time === 'number') {
      return formatter.format(time * 1_000)
    }

    if (isBusinessDay(time)) {
      return `${time.year}/${time.month}/${time.day}`
    }

    return time
  }
}
