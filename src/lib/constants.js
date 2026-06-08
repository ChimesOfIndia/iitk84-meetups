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

// Keep CITY_CLUSTERS as alias for backward compatibility
export const CITY_CLUSTERS = REGIONS

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

export const APP_VERSION = 'V1.1'
export const FEEDBACK_EMAIL = 'akmails@gmail.com'
export const APP_AUTHOR = 'Anuj Kacker'
