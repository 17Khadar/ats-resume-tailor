"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["qa-engineer"];

export default function QAEngineerPage() {
  return <RoleWorkspaceShell role={role} />;
}
