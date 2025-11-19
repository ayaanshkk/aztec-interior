import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard/default'); // ✅ Changed to a specific dashboard page
}