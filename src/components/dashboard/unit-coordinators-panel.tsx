"use client";
import { CoordinatorRegistration } from "./coordinator-registration";
import { TransferCoordinatorPanel } from "./transfer-coordinator-panel";

interface UnitCoordinatorAccount {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type?: "unit_coordinator" | "project_leader" | "extension_office";
  department: string | null;
  unit: string | null;
  created_at: string | null;
}

interface UnitCoordinatorsPanelProps {
  accounts: UnitCoordinatorAccount[];
  department?: string | null;
  view?: "register" | "transfer";
}

export function UnitCoordinatorsPanel({ accounts, department, view = "register" }: UnitCoordinatorsPanelProps) {
  if (view === "transfer") {
    return (
      <TransferCoordinatorPanel
        mode="unit"
        accounts={accounts}
        department={department}
      />
    );
  }

  return (
    <div className="space-y-4">
      <CoordinatorRegistration
        userType="unit_coordinator"
        title="Unit Coordinators"
        description="Register emails of Unit coordinators for your department."
        department={department || undefined}
      />
    </div>
  );
}
