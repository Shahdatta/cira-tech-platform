import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "pm" | "hr" | "member" | "guest";

interface RoleContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("guest");

  // Sync role from authenticated user
  useEffect(() => {
    if (user?.role) {
      const normalizedRole = user.role.toLowerCase() as AppRole;
      const validRoles: AppRole[] = ["admin", "pm", "hr", "member", "guest"];
      setRole(validRoles.includes(normalizedRole) ? normalizedRole : "member");
    } else {
      setRole("guest");
    }
  }, [user]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
