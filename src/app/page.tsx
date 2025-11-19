import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login'); // ✅ Go straight to login
}