"use client";

import {
  Bell, X, Trash2, CheckCheck, ExternalLink,
  FileText, PenLine, DollarSign, Receipt, Plus, Minus,
  CheckCircle2, Factory, Wrench, PartyPopper, Truck, Pin,
  AlertCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

type Notification = {
  id: string;
  job_id?: string;
  customer_id?: string;
  message: string;
  created_at: string;
  moved_by?: string;
  read: boolean;
  dismissed: boolean;
};

// Strip emoji characters from text
function stripEmoji(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}]/gu, "").trim();
}

function formatNotificationMessage(message: string) {
  const clean = stripEmoji(message);
  const hasChangeDetails = clean.includes(" | ") || clean.includes("• ");

  if (!hasChangeDetails) {
    return <p className="text-sm text-gray-900">{clean}</p>;
  }

  const parts = clean.split(". Changes: ");
  if (parts.length === 2) {
    const [mainMessage, changesText] = parts;
    const changes = changesText.split(" | ").filter(Boolean);
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-900">{mainMessage}</p>
        <div className="pl-3 border-l-2 border-gray-300 space-y-0.5">
          {changes.map((change, idx) => (
            <p key={idx} className="text-xs text-gray-500">{stripEmoji(change)}</p>
          ))}
        </div>
      </div>
    );
  }

  if (clean.includes("• ")) {
    const lines = clean.split("\n").filter(l => l.trim());
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-900">{lines[0]}</p>
        {lines.slice(1).length > 0 && (
          <div className="pl-3 border-l-2 border-gray-300 space-y-0.5">
            {lines.slice(1).map((line, idx) => (
              <p key={idx} className="text-xs text-gray-500">{stripEmoji(line)}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <p className="text-sm text-gray-900">{clean}</p>;
}

function getNotificationIcon(message: string) {
  const m = message.toLowerCase();
  if (m.includes("edit") || m.includes("updated") || m.includes("modified")) return <PenLine className="h-4 w-4" />;
  if (m.includes("checklist") || m.includes("submitted")) return <FileText className="h-4 w-4" />;
  if (m.includes("payment") || m.includes("paid") || m.includes("invoice")) return <DollarSign className="h-4 w-4" />;
  if (m.includes("receipt") || m.includes("order")) return <Receipt className="h-4 w-4" />;
  if (m.includes("added") || m.includes("created") || m.includes("new")) return <Plus className="h-4 w-4" />;
  if (m.includes("removed") || m.includes("deleted")) return <Minus className="h-4 w-4" />;
  if (m.includes("approved") || m.includes("accepted") || m.includes("complete")) return <CheckCircle2 className="h-4 w-4" />;
  if (m.includes("production")) return <Factory className="h-4 w-4" />;
  if (m.includes("installation")) return <Wrench className="h-4 w-4" />;
  if (m.includes("delivery")) return <Truck className="h-4 w-4" />;
  if (m.includes("approval") || m.includes("rejected")) return <AlertCircle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function getNotificationPriority(notification: Notification): "high" | "medium" | "low" {
  const msg = notification.message.toLowerCase();
  if (msg.includes("approval") || msg.includes("rejected") || msg.includes("approved")) return "high";
  if (msg.includes("updated") || msg.includes("edited") || msg.includes("modified")) return "medium";
  return "low";
}

export function NotificationSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousUnreadCountRef = useRef<number>(0);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
      audioRef.current?.play().catch(() => {});
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications? This cannot be undone.")) return;
    await clearAllNotifications();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/dashboard/notifications");
  };

  const displayedNotifications = notifications.filter(n => !n.dismissed).slice(0, 50);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "No new notifications"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View All
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {displayedNotifications.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 flex-1 text-xs"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Bell className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">You are all caught up.</p>
            </div>
          ) : (
            <div className="divide-y">
              {displayedNotifications.map((notification) => {
                const priority = getNotificationPriority(notification);
                const icon = getNotificationIcon(notification.message);

                return (
                  <div
                    key={notification.id}
                    className={`group relative px-5 py-4 transition-colors hover:bg-gray-50 ${
                      !notification.read ? "bg-blue-50/40 border-l-4 border-l-blue-500" : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 shrink-0 p-1.5 rounded-md ${
                        priority === "high" ? "bg-red-100 text-red-600" :
                        priority === "medium" ? "bg-blue-100 text-blue-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className={!notification.read ? "font-medium" : ""}>
                          {formatNotificationMessage(notification.message)}
                        </div>

                        <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                          <span>
                            {new Date(notification.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {notification.moved_by && (
                            <span>By {notification.moved_by}</span>
                          )}
                          {priority === "high" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              Important
                            </span>
                          )}
                        </div>

                        {(notification.customer_id || notification.job_id) && (
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {notification.customer_id && (
                              <Link
                                href={`/dashboard/customers/${notification.customer_id}`}
                                className="text-blue-600 hover:underline font-medium"
                                onClick={() => setIsOpen(false)}
                              >
                                View Customer
                              </Link>
                            )}
                            {notification.job_id && (
                              <Link
                                href={`/dashboard/jobs/${notification.job_id}`}
                                className="text-blue-600 hover:underline font-medium"
                                onClick={() => setIsOpen(false)}
                              >
                                View Job
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions (hover) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!notification.read && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                                >
                                  <CheckCheck className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as read</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => dismissNotification(notification.id)}
                                className="h-7 w-7 text-gray-400 hover:bg-gray-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dismiss</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {displayedNotifications.length >= 10 && (
          <div className="shrink-0 border-t px-6 py-3 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="w-full text-xs text-blue-600 hover:text-blue-700"
            >
              View all notifications
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
