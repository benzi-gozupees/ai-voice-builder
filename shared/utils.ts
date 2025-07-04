
export function validateUKPhoneNumber(phone: string): boolean {
  // Basic UK phone number validation
  const ukPhoneRegex = /^(?:(?:\+44)|(?:0))(?:\d{10}|\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{3}\s?\d{3})$/;
  return ukPhoneRegex.test(phone.replace(/\s/g, ""));
}

export function formatUKPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Convert to standard UK format
  if (cleaned.startsWith("+44")) {
    return cleaned.replace("+44", "0");
  }
  
  return cleaned;
}

export function validateWebsiteUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatBusinessHours(hours: any): string {
  const days = Object.keys(hours);
  const openDays = days.filter(day => hours[day].open);
  
  if (openDays.length === 0) return "Closed";
  
  // Group consecutive days with same hours
  const groups: Array<{ days: string[], hours: string }> = [];
  
  openDays.forEach(day => {
    const dayHours = `${hours[day].start} - ${hours[day].end}`;
    const existingGroup = groups.find(g => g.hours === dayHours);
    
    if (existingGroup) {
      existingGroup.days.push(day);
    } else {
      groups.push({ days: [day], hours: dayHours });
    }
  });
  
  return groups.map(group => {
    const dayNames = group.days.map(d => d.charAt(0).toUpperCase() + d.slice(1));
    if (dayNames.length === 1) {
      return `${dayNames[0]}: ${group.hours}`;
    } else if (dayNames.length === 2) {
      return `${dayNames[0]} - ${dayNames[1]}: ${group.hours}`;
    } else {
      return `${dayNames[0]} - ${dayNames[dayNames.length - 1]}: ${group.hours}`;
    }
  }).join(", ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
