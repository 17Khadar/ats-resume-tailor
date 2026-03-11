"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["business-analyst"];

export default function BusinessAnalystPage() {
  return <RoleWorkspaceShell role={role} />;
}
