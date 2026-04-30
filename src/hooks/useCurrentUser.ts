import { useAuth } from "@/contexts/AuthContext";

export function useCurrentUser() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return {
    id: user.id.toString(),
    name: user.employee_name || user.username, 
    username: user.username, 
    email: user.email || `${user.username}@company.com`, 
    avatar: `/avatars/default.png`,
    role: user.role,
  };
}