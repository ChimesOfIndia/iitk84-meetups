export const REGIONS = [
  { value: 'delhi', label: 'Delhi', group: 'India', ncr: true },
  { value: 'gurgaon', label: 'Gurgaon', group: 'India', ncr: true },
  { value: 'noida', label: 'Noida', group: 'India', ncr: true },
  { value: 'bangalore', label: 'Bangalore', group: 'India', ncr: false },
  { value: 'mumbai', label: 'Mumbai', group: 'India', ncr: false },
  { value: 'other_india', label: 'Other India', group: 'India', ncr: false },
  { value: 'bay_area', label: 'Bay Area', group: 'USA', ncr: false },
  { value: 'chicago', label: 'Chicago & Midwest', group: 'USA', ncr: false },
  { value: 'new_york', label: 'New York & Tri-State', group: 'USA', ncr: false },
  { value: 'other_usa', label: 'Other USA', group: 'USA', ncr: false },
  { value: 'middle_east', label: 'Middle East', group: 'Rest of World', ncr: false },
  { value: 'singapore', label: 'Singapore', group: 'Rest of World', ncr: false },
  { value: 'australia', label: 'Australia', group: 'Rest of World', ncr: false },
  { value: 'rest_of_world', label: 'Rest of World', group: 'Rest of World', ncr: false },
]

export const CITY_CLUSTERS = REGIONS

export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST (India)', abbr: 'IST' },
  { value: 'America/Los_Angeles', label: 'PT (Bay Area)', abbr: 'PT' },
  { value: 'America/Chicago', label: 'CT (Chicago)', abbr: 'CT' },
  { value: 'America/New_York', label: 'ET (New York)', abbr: 'ET' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)', abbr: 'SGT' },
  { value: 'Asia/Dubai', label: 'GST (Middle East)', abbr: 'GST' },
  { value: 'Australia/Sydney', label: 'AEST (Australia)', abbr: 'AEST' },
  { value: 'Europe/London', label: 'GMT/BST (UK)', abbr: 'GMT' },
]

export const REGION_TIMEZONE_MAP = {
  delhi: 'Asia/Kolkata', gurgaon: 'Asia/Kolkata', noida: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', other_india: 'Asia/Kolkata',
  bay_area: 'America/Los_Angeles', chicago: 'America/Chicago', new_york: 'America/New_York',
  other_usa: 'America/New_York', middle_east: 'Asia/Dubai', singapore: 'Asia/Singapore',
  australia: 'Australia/Sydney', rest_of_world: 'Europe/London',
}

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'coffee', label: 'Coffee' },
]

export const DIETARY_PREFS = [
  { value: 'veg', label: 'Veg only' },
  { value: 'nonveg', label: 'Non-Veg' },
]

export const RSVP_STATUS = {
  COMING: 'coming',
  MAYBE: 'maybe',
  REGRETS: 'regrets',
}

export const NCR_VALUES = ['delhi', 'gurgaon', 'noida']

export const APP_VERSION = 'V2.0'
export const FEEDBACK_EMAIL = 'akmails@gmail.com'
export const APP_AUTHOR = 'Anuj Kacker'

// Utility: format a UTC datetime in a specific timezone
export function formatInTZ(utcDateStr, timezone, fmt = 'short') {
  if (!utcDateStr) return ''
  try {
    const date = new Date(utcDateStr)
    const abbr = TIMEZONES.find(t => t.value === timezone)?.abbr || ''
    const formatted = date.toLocaleString('en-IN', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${formatted} ${abbr}`
  } catch {
    return utcDateStr
  }
}

// Convert a local datetime-local string + timezone to UTC ISO
export function localToUTC(localStr, timezone) {
  if (!localStr) return null
  try {
    // Create a date as if it's in the given timezone
    const [datePart, timePart] = localStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    // Use Intl to find offset
    const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
    const localStr2 = testDate.toLocaleString('en-CA', { timeZone: timezone, hour12: false })
    const localDate = new Date(localStr2.replace(',', ''))
    const offset = testDate - localDate
    return new Date(testDate.getTime() + offset).toISOString()
  } catch {
    return new Date(localStr).toISOString()
  }
}

// Convert UTC ISO to datetime-local string in a timezone
export function utcToLocal(utcStr, timezone) {
  if (!utcStr) return ''
  try {
    const date = new Date(utcStr)
    const parts = date.toLocaleString('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    // en-CA gives YYYY-MM-DD, HH:MM
    return parts.replace(', ', 'T').replace(',', 'T').substring(0, 16)
  } catch {
    return utcStr.slice(0, 16)
  }
}
