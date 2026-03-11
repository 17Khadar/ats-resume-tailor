"use client";

import { ROLE_MAP } from "@/lib/roles";
import RoleWorkspaceShell from "@/components/workspace/RoleWorkspaceShell";

const role = ROLE_MAP["software-developer"];

export default function SoftwareDeveloperPage() {
  return <RoleWorkspaceShell role={role} />;
}
