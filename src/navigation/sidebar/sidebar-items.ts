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
  Home,
  Briefcase,
  FileText,
  Settings,
  type LucideIcon,
  Bot,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: string[]; // Add roles field
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
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Jobs",
        url: "/dashboard/jobs",
        icon: Briefcase,
        roles: ["manager", "HR", "production"],
      },
      {
        title: "Sales Pipeline",
        url: "/dashboard/sales_pipeline",
        icon: Briefcase,
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Schedule",
        url: "/dashboard/schedule",
        icon: Calendar,
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Forms/Checklists",
        url: "/dashboard/forms",
        icon: FileText,
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Appliances",
        url: "/dashboard/appliances",
        icon: Forklift,
        roles: ["manager", "HR", "production"],
      },
      {
        title: "Chatbot",
        url: "/dashboard/chatbot",
        icon: Bot,
        roles: ["manager", "HR", "sales", "production"],
      },
      {
        title: "Approvals",
        url: "/dashboard/approvals",
        icon: CheckCircle,
        roles: ["manager"],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        roles: ["manager", "HR", "sales", "production"],
      },
    ],
  },
];

// Filter sidebar items based on user role
export const getSidebarItems = (userRole: string): NavGroup[] => {
  return allSidebarItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // If no roles defined, show to everyone
        if (!item.roles || item.roles.length === 0) return true;
        // Check if user's role is in the allowed roles
        return item.roles.includes(userRole);
      }),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
};

// For backwards compatibility, export default items (manager view shows all)
export const sidebarItems = getSidebarItems("manager");
