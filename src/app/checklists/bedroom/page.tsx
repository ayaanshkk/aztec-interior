"use client";

import dynamic from 'next/dynamic';

// Dynamically import the bedroom checklist component
const BedroomChecklist = dynamic(
  () => import('@/app/form/[token]/bedroom-checklist'),
  { ssr: false }
);

export default function BedroomChecklistPage() {
  return <BedroomChecklist />;
}