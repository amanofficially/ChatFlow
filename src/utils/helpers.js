import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

export function formatMessageTime(date) {
  const d = new Date(date);
  return format(d, "h:mm a");
}

export function formatConversationTime(date) {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function formatLastSeen(date) {
  if (!date) return "Offline";
  return `Last seen ${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Single source of truth for reading the stored user ID
export function getStoredUserId() {
  try {
    return JSON.parse(localStorage.getItem("chat_user") || "{}")._id ?? null;
  } catch {
    return null;
  }
}
