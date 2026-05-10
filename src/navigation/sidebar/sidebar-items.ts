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
  DollarSign,
  PoundSterlingIcon,
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
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Sales Pipeline",
        url: "/dashboard/sales_pipeline",
        icon: Briefcase,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Tasks",
        url: "/dashboard/tasks",
        icon: Briefcase,
        roles: ["Platform Admin", "Production Team"],
      },
      {
        title: "Orders",
        url: "/dashboard/materials",
        icon: Package,
        roles: ["Platform Admin", "Production Team"],
      },
      {
        title: "Calendar",
        url: "/dashboard/calendar",
        icon: Calendar,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Forms/Checklists",
        url: "/dashboard/forms",
        icon: FileText,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Appliance Catalogue",
        url: "/dashboard/appliances",
        icon: Forklift,
        roles: ["Platform Admin", "Production Team"],
      },
      {
        title: "Price List",
        url: "/dashboard/pricelist",
        icon: PoundSterlingIcon,
        roles: ["Platform Admin"],
        isNew: true, // Show "New" badge for visibility
      },
      {
        title: "Chatbot",
        url: "/dashboard/chatbot",
        icon: Bot,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: Bell,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        roles: ["Platform Admin", "Salesperson", "Production Team"],
      },
    ],
  },
];

// Filter sidebar items based on user role and optionally set notification badge
export const getSidebarItems = (userRole: string, notificationCount?: number): NavGroup[] => {
  if (!userRole) return [];
  
  const normalizedRole = userRole.toLowerCase();
  
  return allSidebarItems
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          // If no roles defined, show to everyone
          if (!item.roles || item.roles.length === 0) return true;
          // Check if user's role is in the allowed roles (case-insensitive)
          return item.roles.some(role => role.toLowerCase() === normalizedRole);
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
        }),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
};

// For backwards compatibility, export default items (platform admin view shows all)
export const sidebarItems = getSidebarItems("Platform Admin");