"use client";

import dynamic from 'next/dynamic';

// Dynamically import the kitchen checklist component
const KitchenChecklist = dynamic(
  () => import('@/app/form/[token]/kitchen-checklist'),
  { ssr: false }
);

export default function KitchenChecklistPage() {
  return <KitchenChecklist />;
}