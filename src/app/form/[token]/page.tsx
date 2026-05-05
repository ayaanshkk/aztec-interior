"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import KitchenChecklist from "./kitchen-checklist";
import BedroomChecklist from "./bedroom-checklist";

export default function FormPage() {
  const searchParams = useSearchParams();
  const [formType, setFormType] = useState<"bedroom" | "kitchen" | null>(null);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "kitchen" || typeParam === "bedroom") {
      setFormType(typeParam);
    } else {
      // Default to bedroom if no type specified
      setFormType("bedroom");
    }
  }, [searchParams]);

  if (!formType) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return formType === "kitchen" ? <KitchenChecklist /> : <BedroomChecklist />;
}