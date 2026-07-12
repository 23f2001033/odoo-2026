import { NativeSelect } from "@/components/ui/native-select";

export type Person = { id: string; name: string };

// Shared by the Allocate / Request Transfer dialogs and the standalone
// "New Allocation" dialog on the Allocations screen — an employee-or-
// department target picker, since Allocation.holder and TransferRequest.target
// are both XOR(userId, deptId) pairs (docs/04 §3).
export function HolderPicker({
  kind,
  onKindChange,
  employees,
  departments,
  fieldName,
  defaultUserId,
}: {
  kind: "user" | "dept";
  onKindChange: (k: "user" | "dept") => void;
  employees: Person[];
  departments: Person[];
  fieldName: string;
  defaultUserId?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === "user"} onChange={() => onKindChange("user")} className="accent-primary" />
          Employee
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === "dept"} onChange={() => onKindChange("dept")} className="accent-primary" />
          Department
        </label>
      </div>
      {kind === "user" ? (
        <NativeSelect name={fieldName} required defaultValue={defaultUserId}>
          <option value="" disabled>Select an employee…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </NativeSelect>
      ) : (
        <NativeSelect name={fieldName} required defaultValue="">
          <option value="" disabled>Select a department…</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </NativeSelect>
      )}
    </div>
  );
}
