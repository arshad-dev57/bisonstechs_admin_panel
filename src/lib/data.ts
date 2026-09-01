export type UserRole = "Admin" | "Editor" | "Viewer";
export type UserStatus = "Active" | "Pending" | "Suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  projects: number;
}

export interface Client {
  id: string;
  company: string;
  contact: string;
  email: string;
  country: string;
  value: number;
  status: "Active" | "Inactive";
}

export type PaymentStatus = "Paid" | "Pending" | "Failed" | "Refunded";

export interface Payment {
  id: string;
  customer: string;
  email: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  date: string;
}

export const users: User[] = [
  { id: "U-001", name: "Atif Raza", email: "atif@bisonstechs.dev", role: "Admin", status: "Active", joined: "Jan 12, 2025", projects: 12 },
  { id: "U-002", name: "Sana Khalid", email: "sana@bisonstechs.dev", role: "Editor", status: "Active", joined: "Feb 03, 2025", projects: 8 },
  { id: "U-003", name: "Bilal Ahmed", email: "bilal@bisonstechs.dev", role: "Viewer", status: "Pending", joined: "Mar 21, 2025", projects: 0 },
  { id: "U-004", name: "Mariam Yousaf", email: "mariam@bisonstechs.dev", role: "Editor", status: "Active", joined: "Apr 11, 2025", projects: 6 },
  { id: "U-005", name: "Usman Tariq", email: "usman@bisonstechs.dev", role: "Viewer", status: "Suspended", joined: "May 07, 2025", projects: 2 },
  { id: "U-006", name: "Fatima Noor", email: "fatima@bisonstechs.dev", role: "Admin", status: "Active", joined: "Jun 19, 2025", projects: 15 },
  { id: "U-007", name: "Hamza Sheikh", email: "hamza@bisonstechs.dev", role: "Editor", status: "Pending", joined: "Jul 02, 2025", projects: 0 },
  { id: "U-008", name: "Ayesha Imran", email: "ayesha@bisonstechs.dev", role: "Viewer", status: "Active", joined: "Aug 14, 2025", projects: 4 },
];

export const clients: Client[] = [
  { id: "C-001", company: "TecnoWave Pvt Ltd", contact: "Ahmed Faraz", email: "ahmed@teknowave.pk", country: "Pakistan", value: 42000, status: "Active" },
  { id: "C-002", company: "CloudSync LLC", contact: "David Ross", email: "david@cloudsync.io", country: "USA", value: 75800, status: "Active" },
  { id: "C-003", company: "GlobalMart", contact: "Lucy Chen", email: "lucy@globalmart.com", country: "Singapore", value: 31000, status: "Active" },
  { id: "C-004", company: "FinEdge Solutions", contact: "Omar Hassan", email: "omar@finedge.ae", country: "UAE", value: 58900, status: "Inactive" },
  { id: "C-005", company: "Skylark Media", contact: "Nina Kovacs", email: "nina@skylark.eu", country: "Germany", value: 22600, status: "Active" },
  { id: "C-006", company: "Vertex Analytics", contact: "Ravi Kumar", email: "ravi@vertex.in", country: "India", value: 46700, status: "Active" },
];

export const payments: Payment[] = [
  { id: "PAY-1001", customer: "Ahmed Faraz", email: "ahmed@tecknowave.pk", method: "Visa •• 4242", amount: 42000, status: "Paid", date: "Aug 24, 2025" },
  { id: "PAY-1002", customer: "David Ross", email: "david@cloudsync.io", method: "Mastercard •• 5521", amount: 75800, status: "Paid", date: "Aug 22, 2025" },
  { id: "PAY-1003", customer: "Lucy Chen", email: "lucy@globalmart.com", method: "Bank Transfer", amount: 31000, status: "Pending", date: "Aug 21, 2025" },
  { id: "PAY-1004", customer: "Nina Kovacs", email: "nina@skylark.eu", method: "PayPal", amount: 22600, status: "Paid", date: "Aug 19, 2025" },
  { id: "PAY-1005", customer: "Ravi Kumar", email: "ravi@vertex.in", method: "UPI", amount: 46700, status: "Failed", date: "Aug 18, 2025" },
  { id: "PAY-1006", customer: "Omar Hassan", email: "omar@finedge.ae", method: "Bank Transfer", amount: 58900, status: "Refunded", date: "Aug 16, 2025" },
  { id: "PAY-1007", customer: "Ali Khan", email: "ali@plugin.pk", method: "Visa •• 8890", amount: 12400, status: "Paid", date: "Aug 15, 2025" },
  { id: "PAY-1008", customer: "Sara Malik", email: "sara@mail.com", method: "Mastercard", amount: 8900, status: "Pending", date: "Aug 12, 2025" },
];

/** Revenue trend: label = month, value = thousands (PKR x 1000) */
export const revenueTrend = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 55 },
  { label: "Mar", value: 48 },
  { label: "Apr", value: 68 },
  { label: "May", value: 62 },
  { label: "Jun", value: 82 },
  { label: "Jul", value: 74 },
  { label: "Aug", value: 96 },
];

/** Weekly active sessions for the bar chart */
export const weeklyActivity = [
  { label: "Mon", value: 120 },
  { label: "Tue", value: 150 },
  { label: "Wed", value: 98 },
  { label: "Thu", value: 174 },
  { label: "Fri", value: 136 },
  { label: "Sat", value: 210 },
  { label: "Sun", value: 88 },
];

/** User distribution by role for the donut chart */
export const roleDistribution = [
  { label: "Admin", value: 25, color: "#6366f1" },
  { label: "Editor", value: 40, color: "#22c55e" },
  { label: "Viewer", value: 35, color: "#f59e0b" },
];