"use client";
import { CoordinatorRegistration } from "./coordinator-registration";
import { AccountsTable } from "./accounts-table";
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
}

export function UnitCoordinatorsPanel({ accounts, department }: UnitCoordinatorsPanelProps) {
  return (
    <div className="space-y-4">
      <CoordinatorRegistration
        userType="unit_coordinator"
        title="Unit Coordinators"
        description="Register emails of Unit coordinators for your department."
        department={department || undefined}
      />

      <AccountsTable
        accounts={accounts}
        title="Registered Unit Coordinators"
        description="Accounts under your department units."
      />

      <TransferCoordinatorPanel
        mode="unit"
        accounts={accounts}
        department={department}
      />
    </div>
  );
}
