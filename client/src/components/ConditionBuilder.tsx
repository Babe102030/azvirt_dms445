import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Brackets } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string | number;
}

interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

interface ConditionBuilderProps {
  value: ConditionGroup;
  onChange: (value: ConditionGroup) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  const { data: options } = trpc.notificationTemplates.getConditionOptions.useQuery();

  const addCondition = useCallback((groupId: string) => {
    const newCondition: Condition = {
      id: generateId(),
      field: options?.fields[0]?.id || "",
      operator: "eq",
      value: "",
    };

    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition],
        };
      }
      return {
        ...group,
        conditions: group.conditions.map((c) =>
          "logic" in c ? updateGroup(c as ConditionGroup) : c
        ),
      };
    };

    onChange(updateGroup(value));
  }, [value, onChange, options]);

  const addGroup = useCallback((parentGroupId: string) => {
    const newGroup: ConditionGroup = {
      id: generateId(),
      logic: "AND",
      conditions: [],
    };

    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === parentGroupId) {
        return {
          ...group,
          conditions: [...group.conditions, newGroup],
        };
      }
      return {
        ...group,
        conditions: group.conditions.map((c) =>
          "logic" in c ? updateGroup(c as ConditionGroup) : c
        ),
      };
    };

    onChange(updateGroup(value));
  }, [value, onChange]);

  const updateCondition = useCallback((conditionId: string, updates: Partial<Condition>) => {
    const updateInGroup = (group: ConditionGroup): ConditionGroup => ({
      ...group,
      conditions: group.conditions.map((c) => {
        if ("logic" in c) {
          return updateInGroup(c as ConditionGroup);
        }
        if ((c as Condition).id === conditionId) {
          return { ...c, ...updates } as Condition;
        }
        return c;
      }),
    });

    onChange(updateInGroup(value));
  }, [value, onChange]);

  const updateGroupLogic = useCallback((groupId: string, logic: "AND" | "OR") => {
    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return { ...group, logic };
      }
      return {
        ...group,
        conditions: group.conditions.map((c) =>
          "logic" in c ? updateGroup(c as ConditionGroup) : c
        ),
      };
    };

    onChange(updateGroup(value));
  }, [value, onChange]);

  const removeItem = useCallback((itemId: string) => {
    const removeFromGroup = (group: ConditionGroup): ConditionGroup => ({
      ...group,
      conditions: group.conditions
        .filter((c) => {
          if ("logic" in c) {
            return (c as ConditionGroup).id !== itemId;
          }
          return (c as Condition).id !== itemId;
        })
        .map((c) => ("logic" in c ? removeFromGroup(c as ConditionGroup) : c)),
    });

    onChange(removeFromGroup(value));
  }, [value, onChange]);

  const getFieldType = (fieldId: string) => {
    return options?.fields.find((f) => f.id === fieldId)?.type || "string";
  };

  const getFieldOptions = (fieldId: string) => {
    return options?.fields.find((f) => f.id === fieldId)?.options || [];
  };

  const getOperatorsForField = (fieldId: string) => {
    const fieldType = getFieldType(fieldId);
    return options?.operators.filter((op) => op.types.includes(fieldType)) || [];
  };

  const renderCondition = (condition: Condition, depth: number) => {
    const fieldType = getFieldType(condition.field);
    const fieldOptions = getFieldOptions(condition.field);
    const availableOperators = getOperatorsForField(condition.field);

    return (
      <div
        key={condition.id}
        className="flex items-center gap-2 p-3 bg-background rounded-lg border"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />

        {/* Field Select */}
        <Select
          value={condition.field}
          onValueChange={(field) => updateCondition(condition.id, { field, operator: "eq", value: "" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Odaberi polje" />
          </SelectTrigger>
          <SelectContent>
            {options?.fields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator Select */}
        <Select
          value={condition.operator}
          onValueChange={(operator) => updateCondition(condition.id, { operator })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        {fieldType === "select" ? (
          <Select
            value={String(condition.value)}
            onValueChange={(value) => updateCondition(condition.id, { value })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Vrijednost" />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={fieldType === "number" ? "number" : "text"}
            value={condition.value}
            onChange={(e) =>
              updateCondition(condition.id, {
                value: fieldType === "number" ? Number(e.target.value) : e.target.value,
              })
            }
            placeholder="Vrijednost"
            className="w-[150px]"
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => removeItem(condition.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderGroup = (group: ConditionGroup, depth: number = 0) => {
    const isRoot = depth === 0;

    return (
      <div
        key={group.id}
        className={`space-y-3 ${!isRoot ? "ml-6 pl-4 border-l-2 border-primary/30" : ""}`}
      >
        {/* Group Header */}
        <div className="flex items-center gap-3">
          {!isRoot && (
            <Badge variant="outline" className="text-xs">
              Grupa
            </Badge>
          )}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={group.logic === "AND" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => updateGroupLogic(group.id, "AND")}
            >
              I (AND)
            </Button>
            <Button
              variant={group.logic === "OR" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => updateGroupLogic(group.id, "OR")}
            >
              ILI (OR)
            </Button>
          </div>
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-7 w-7"
              onClick={() => removeItem(group.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          {group.conditions.map((item, index) => (
            <div key={"logic" in item ? (item as ConditionGroup).id : (item as Condition).id}>
              {index > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.logic}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {"logic" in item
                ? renderGroup(item as ConditionGroup, depth + 1)
                : renderCondition(item as Condition, depth)}
            </div>
          ))}
        </div>

        {/* Add Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCondition(group.id)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Dodaj uslov
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addGroup(group.id)}
          >
            <Brackets className="w-4 h-4 mr-1" />
            Dodaj grupu
          </Button>
        </div>
      </div>
    );
  };

  const generateSummary = (group: ConditionGroup): string => {
    if (group.conditions.length === 0) return "Nema definisanih uslova";

    const parts = group.conditions.map((item) => {
      if ("logic" in item) {
        return `(${generateSummary(item as ConditionGroup)})`;
      }
      const condition = item as Condition;
      const field = options?.fields.find((f) => f.id === condition.field);
      const operator = options?.operators.find((o) => o.id === condition.operator);
      return `${field?.label || condition.field} ${operator?.label || condition.operator} ${condition.value}`;
    });

    return parts.join(` ${group.logic === "AND" ? "I" : "ILI"} `);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brackets className="w-5 h-5" />
          Uslovi okidanja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderGroup(value)}

        {/* Summary */}
        {value.conditions.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Sažetak pravila:</p>
            <p className="text-sm text-muted-foreground">{generateSummary(value)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to create initial empty condition group
export function createEmptyConditionGroup(): ConditionGroup {
  return {
    id: generateId(),
    logic: "AND",
    conditions: [],
  };
}

// Helper to serialize condition group to JSON
export function serializeConditions(group: ConditionGroup): string {
  return JSON.stringify(group);
}

// Helper to deserialize JSON to condition group
export function deserializeConditions(json: string): ConditionGroup {
  try {
    return JSON.parse(json);
  } catch {
    return createEmptyConditionGroup();
  }
}
