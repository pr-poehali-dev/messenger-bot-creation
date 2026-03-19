export type SubStatus = "trial" | "active" | "expired" | "none";
export type Tab = "subscription" | "referral" | "violations" | "lists";

export interface UserData {
  max_user_id: number;
  max_username: string;
  max_name: string;
  is_admin: boolean;
  session_token?: string;
  subscription: { status: SubStatus; expires: string | null };
}

export interface RefData {
  ref_code: string;
  ref_link: string;
  invited_count: number;
  total_bonus_days: number;
}

export interface Violation {
  type: string;
  count: number;
}

export interface ViolationsData {
  total: number;
  by_type: Violation[];
  top_violators: { user_id: number; name: string; count: number }[];
  by_day: { date: string; count: number }[];
}

export interface ListEntry {
  user_id: number;
  name: string;
  added_at: string;
}

export const PLANS = [
  { plan: "month",   label: "1 месяц",   price: 59,  badge: null,      per: "59 ₽/мес" },
  { plan: "quarter", label: "3 месяца",  price: 149, badge: "Выгодно", per: "≈ 50 ₽/мес" },
  { plan: "year",    label: "Год",       price: 390, badge: "-34%",    per: "≈ 33 ₽/мес" },
  { plan: "agency",  label: "Агентство", price: 990, badge: "5 групп", per: "≈ 198 ₽/группу" },
];

export const LOGO = "https://cdn.poehali.dev/projects/a42d062d-9fbc-499f-a244-58736cf70e7a/files/dd4734fe-a2fe-44d2-97cf-3df5440f4a2c.jpg";

export function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
