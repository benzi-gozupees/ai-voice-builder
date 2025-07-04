// Industry options now loaded from database via API
export const UK_INDUSTRIES = [
  { value: "healthcare", label: "Healthcare & Medical" },
  { value: "dental", label: "Dental Services" },
  { value: "legal", label: "Legal Services" },
  { value: "beauty", label: "Beauty & Wellness" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "consulting", label: "Consulting" },
  { value: "automotive", label: "Automotive" },
  { value: "real-estate", label: "Real Estate" },
  { value: "veterinary", label: "Veterinary Services" },
  { value: "education", label: "Education & Training" },
  { value: "financial", label: "Financial Services" },
  { value: "hospitality", label: "Hospitality & Tourism" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "professional-services", label: "Professional Services" },
  { value: "others", label: "Other" },
];

export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: true, start: "09:00", end: "17:00" },
  tuesday: { open: true, start: "09:00", end: "17:00" },
  wednesday: { open: true, start: "09:00", end: "17:00" },
  thursday: { open: true, start: "09:00", end: "17:00" },
  friday: { open: true, start: "09:00", end: "17:00" },
  saturday: { open: false, start: "10:00", end: "14:00" },
  sunday: { open: false, start: "10:00", end: "14:00" },
};

export const APPOINTMENT_DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export const BUFFER_TIMES = [
  { value: 0, label: "No buffer" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
];

export const CALENDAR_PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Seamlessly sync with your existing Google Calendar. Perfect for Gmail users.",
    icon: "fab fa-google",
    color: "bg-blue-500",
    features: ["Real-time sync", "Multi-calendar support"],
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Perfect for businesses using Microsoft 365 or Outlook.com.",
    icon: "fab fa-microsoft",
    color: "bg-blue-600",
    features: ["Exchange integration", "Teams compatibility"],
  },
];
