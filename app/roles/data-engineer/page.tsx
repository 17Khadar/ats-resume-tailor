"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["data-engineer"];

export default function DataEngineerPage() {
  return <RoleWorkspaceShell role={role} />;
}
