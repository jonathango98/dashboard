import { differenceInDays, parseISO } from 'date-fns'

export function urgencyScore(task) {
  const days = differenceInDays(parseISO(task.deadline), new Date())
  const deadlineScore = days <= 0 ? 100 : Math.max(0, 10 - days)
  return task.importance * 2 + deadlineScore
}

export function daysLeft(task) {
  return differenceInDays(parseISO(task.deadline), new Date())
}
