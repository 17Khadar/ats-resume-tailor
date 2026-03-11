"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["devops-engineer"];

export default function DevOpsEngineerPage() {
  return <RoleWorkspaceShell role={role} />;
}
