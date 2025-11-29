import {
  ShoppingBag,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Gauge,
  GraduationCap,
  CheckCircle,
  Package,
  Home,
  Briefcase,
  FileText,
  Settings,
  type LucideIcon,
  Bot,
  Bell,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: string[]; // Add roles field
  badge?: number | string; // Add badge support for notification count
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: string[]; // Add roles field
  badge?: number | string; // Add badge support for notification count
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

// Define all sidebar items with role permissions
const allSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/default",
        icon: Home,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Sales Pipeline",
        url: "/dashboard/sales_pipeline",
        icon: Briefcase,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Tasks",
        url: "/dashboard/jobs",
        icon: Briefcase,
        roles: ["manager", "hr", "production"],
      },
      {
        title: "Orders",
        url: "/dashboard/materials",
        icon: Package,
        roles: ["manager", "hr", "production"],
      },
      {
        title: "Schedule",
        url: "/dashboard/schedule",
        icon: Calendar,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Forms/Checklists",
        url: "/dashboard/forms",
        icon: FileText,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Appliance Catalogue",
        url: "/dashboard/appliances",
        icon: Forklift,
        roles: ["manager", "hr", "production"],
      },
      {
        title: "Chatbot",
        url: "/dashboard/chatbot",
        icon: Bot,
        roles: ["manager", "hr", "sales", "production"],
      },
      {
        title: "Approvals",
        url: "/dashboard/approvals",
        icon: CheckCircle,
        roles: ["manager"],
      },
      {
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: Bell,
        roles: ["manager", "hr", "sales", "production"],
        // Badge will be set dynamically - don't hardcode it here
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        roles: ["manager", "hr", "sales", "production"],
      },
    ],
  },
];

// Filter sidebar items based on user role and optionally set notification badge
export const getSidebarItems = (userRole: string, notificationCount?: number): NavGroup[] => {
  const normalizedRole = userRole?.toLowerCase();
  return allSidebarItems
    .map((group) => ({
      ...group,
      // ✅ FIX: Add safety check for group.items
      items: Array.isArray(group.items) ? group.items
        .filter((item) => {
          // If no roles defined, show to everyone
          if (!item.roles || item.roles.length === 0) return true;
          // Check if user's role is in the allowed roles
          return item.roles.includes(userRole);
        })
        .map((item) => {
          // Update notification badge count dynamically
          if (item.title === "Notifications" && notificationCount !== undefined && notificationCount > 0) {
            return {
              ...item,
              badge: notificationCount > 9 ? '9+' : notificationCount,
            };
          }
          return item;
        }) : [],
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
};

// For backwards compatibility, export default items (manager view shows all)
export const sidebarItems = getSidebarItems("manager");