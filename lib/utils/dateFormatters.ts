/**
 * Format timestamp to IST timezone with only hour and minute with AM/PM (no seconds, no date)
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string in IST timezone (e.g., "02:30 PM")
 */
export function formatTimestampIST(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return date.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Format timestamp to IST timezone with only hour and minute with AM/PM (no date)
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string in IST timezone (e.g., "02:30 PM")
 */
export function formatTimeIST(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return date.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Format date only (no time) in IST
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "28 Nov 2024")
 */
export function formatDateIST(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Get current time in IST as ISO string for database storage
 * Converts current UTC time to IST (UTC+5:30) and returns as ISO string
 * @returns ISO string representing current IST time
 */
export function getCurrentISTTime(): string {
  const now = new Date();
  // Get IST time by formatting in IST timezone and parsing back
  // IST is UTC+5:30
  const istString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the IST string and create a date object
  // Format: "MM/DD/YYYY, HH:MM:SS"
  const [datePart, timePart] = istString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  // Create a date object in IST (treating it as if it were UTC for storage)
  // This represents the IST time as if it were UTC
  const istDate = new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ));
  
  return istDate.toISOString();
}

/**
 * Convert any date to IST timezone ISO string for database storage
 * IST is UTC+5:30, so we add 5 hours and 30 minutes to the given time
 * @param date - Date object or ISO string (optional, defaults to now)
 * @returns ISO string in IST timezone
 */
export function toISTISOString(date?: string | Date): string {
  const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  // IST is UTC+5:30 (5 hours 30 minutes = 5.5 hours = 19800000 milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(inputDate.getTime() + istOffset);
  return istTime.toISOString();
}
