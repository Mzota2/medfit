import { Address, BaseDocument,ContactInfo} from "./common";

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayHours {
  isOpen: boolean;
  openTime?: string; // Format: "HH:mm" (24-hour format, e.g., "07:00", "14:30")
  closeTime?: string; // Format: "HH:mm" (24-hour format, e.g., "18:00", "22:00")
  isHalfDay?: boolean; // For days like Sunday/Saturday when they go to church
  notes?: string; // Optional notes like "Closed for holidays"
}

export interface OpeningHours {
  // Default hours that apply to all days (can be overridden per day)
  defaultHours?: {
    openTime: string; // e.g., "07:00"
    closeTime: string; // e.g., "18:00"
  };
  // Per-day configuration
  days: {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
  };
  // Holiday closures (dates when business is closed)
  holidayClosures?: string[]; // Array of dates in ISO format: "YYYY-MM-DD"
  // Timezone (optional, defaults to business location timezone)
  timezone?: string;
}

export interface business extends BaseDocument {
  name: string;
  description?: string;
  address: Address;
  contactInfo: ContactInfo;
  logo?: string;
  banner?: string;
  tpin?: string; // Taxpayer Identification Number
  openingHours?: OpeningHours; // Comprehensive opening hours configuration
  // Refund and return policy fields
  returnDuration?: number; // Number of days customers have to return items
  refundDuration?: number; // Number of days it takes to process refunds
  cancellationTime?: number; // Hours before service/booking that cancellation is allowed
  returnShippingPayer?: 'customer' | 'business'; // Who pays for return shipping
  // Map fields
  googleMap?: string; // Google Maps iframe HTML code
  mapImage?: string; // Alternative map image URL (if Google Map is not available)
}

// Legacy support - kept for backward compatibility
export interface OpeningDays {
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}