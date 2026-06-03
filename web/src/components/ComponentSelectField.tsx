import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Department } from "@/models/departments";

export const COMPONENT_MICHIGAN_TRAVEL_2026 =
  "Michigan 2026 Purchases & Travel";
export const MICHIGAN_COMPONENT_DEPARTMENT_NAME = "Business";

const COMPONENT_SELECT_OTHER = "__other__";

export function applyComponentDepartmentUpdate<
  T extends { component?: string; department_id?: string },
>(purchaseRequest: T, component: string, departments: Department[]): T {
  const updates: Partial<T> = { component } as Partial<T>;

  if (component === COMPONENT_MICHIGAN_TRAVEL_2026) {
    const businessDept = departments.find(
      (d) => d.name === MICHIGAN_COMPONENT_DEPARTMENT_NAME,
    );
    if (businessDept) {
      updates.department_id = businessDept.id;
    }
  } else if (purchaseRequest.component === COMPONENT_MICHIGAN_TRAVEL_2026) {
    updates.department_id = "";
  }

  return { ...purchaseRequest, ...updates };
}

type ComponentSelectFieldProps = {
  value: string;
  onChange: (component: string) => void;
  id?: string;
};

export function ComponentSelectField({
  value,
  onChange,
  id = "component",
}: ComponentSelectFieldProps) {
  const [isOtherSelected, setIsOtherSelected] = useState(
    () => Boolean(value) && value !== COMPONENT_MICHIGAN_TRAVEL_2026,
  );

  useEffect(() => {
    if (value === COMPONENT_MICHIGAN_TRAVEL_2026) {
      setIsOtherSelected(false);
    } else if (value) {
      setIsOtherSelected(true);
    }
  }, [value]);

  const selectValue =
    value === COMPONENT_MICHIGAN_TRAVEL_2026
      ? COMPONENT_MICHIGAN_TRAVEL_2026
      : isOtherSelected
        ? COMPONENT_SELECT_OTHER
        : "";

  const otherValue =
    value === COMPONENT_MICHIGAN_TRAVEL_2026 ? "" : value || "";

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(selected) => {
          if (selected === COMPONENT_MICHIGAN_TRAVEL_2026) {
            setIsOtherSelected(false);
            onChange(COMPONENT_MICHIGAN_TRAVEL_2026);
          } else {
            setIsOtherSelected(true);
            if (value === COMPONENT_MICHIGAN_TRAVEL_2026) {
              onChange("");
            }
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select a component" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={COMPONENT_MICHIGAN_TRAVEL_2026}>
            {COMPONENT_MICHIGAN_TRAVEL_2026}
          </SelectItem>
          <SelectItem value={COMPONENT_SELECT_OTHER}>Other</SelectItem>
        </SelectContent>
      </Select>
      {isOtherSelected && (
        <Input
          id={`${id}-other`}
          placeholder="Enter component / subsystem"
          value={otherValue}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
