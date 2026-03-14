"use client";
import { CoordinatorRegistration } from "./coordinator-registration";
import { AccountsTable } from "./accounts-table";

interface UnitCoordinatorAccount {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type?: "unit_coordinator";
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
    </div>
  );
}
