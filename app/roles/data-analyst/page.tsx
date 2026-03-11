"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["data-analyst"];

export default function DataAnalystPage() {
  return <RoleWorkspaceShell role={role} />;
}
