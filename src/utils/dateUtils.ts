/**
 * Formats a date to show how long ago it was posted
 * Similar to the formatDistanceToNow function from date-fns
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const secondsDiff = Math.round((now.getTime() - date.getTime()) / 1000);
  
  if (secondsDiff < 60) {
    return `${secondsDiff}s`;
  }
  
  const minutesDiff = Math.round(secondsDiff / 60);
  if (minutesDiff < 60) {
    return `${minutesDiff}m`;
  }
  
  const hoursDiff = Math.round(minutesDiff / 60);
  if (hoursDiff < 24) {
    return `${hoursDiff}h`;
  }
  
  const daysDiff = Math.round(hoursDiff / 24);
  if (daysDiff < 7) {
    return `${daysDiff}d`;
  }
  
  const weeksDiff = Math.round(daysDiff / 7);
  if (weeksDiff < 4) {
    return `${weeksDiff}w`;
  }
  
  const monthsDiff = Math.round(daysDiff / 30);
  if (monthsDiff < 12) {
    return `${monthsDiff}mo`;
  }
  
  const yearsDiff = Math.round(daysDiff / 365);
  return `${yearsDiff}y`;
}