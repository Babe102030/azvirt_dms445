import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExportFormat,
  ExportColumn,
  exportData,
  generateExportFilename,
} from "@/lib/exportUtils";
import {
  GripVertical,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  Settings2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface ExportDialogProps<T> {
  data: T[];
  columns: ExportColumn[];
  isOpen: boolean;
  onClose: () => void;
  filenamePrefix?: string;
}

/**
 * Draggable Item Component for Columns
 */
function SortableColumnItem({
  column,
  isSelected,
  onToggle,
}: {
  column: ExportColumn;
  isSelected: boolean;
  onToggle: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 mb-2 rounded-md border bg-card transition-all duration-200",
        isDragging
          ? "shadow-lg ring-2 ring-primary/20 scale-[1.02] border-primary/50"
          : "hover:border-primary/30",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary active:cursor-grabbing p-1 -ml-1"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-3 flex-1">
        <Checkbox
          id={`col-${column.key}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(column.key)}
        />
        <Label
          htmlFor={`col-${column.key}`}
          className="text-sm font-medium cursor-pointer flex-1 select-none"
        >
          {column.header}
        </Label>
      </div>
    </div>
  );
}

/**
 * Main ExportDialog Component
 */
export function ExportDialog<T>({
  data,
  columns: initialColumns,
  isOpen,
  onClose,
  filenamePrefix = "export",
}: ExportDialogProps<T>) {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    new Set(initialColumns.map((c) => c.key)),
  );
  const [orderedColumns, setOrderedColumns] =
    React.useState<ExportColumn[]>(initialColumns);
  const [format, setFormat] = React.useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = React.useState(false);

  // Sync state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setOrderedColumns(initialColumns);
      setSelectedKeys(new Set(initialColumns.map((c) => c.key)));
    }
  }, [isOpen, initialColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedColumns((items) => {
        const oldIndex = items.findIndex((i) => i.key === active.id);
        const newIndex = items.findIndex((i) => i.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = (key: string) => {
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    setSelectedKeys(newKeys);
  };

  const toggleAll = () => {
    if (selectedKeys.size === orderedColumns.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(orderedColumns.map((c) => c.key)));
    }
  };

  const resetOrder = () => {
    setOrderedColumns(initialColumns);
  };

  const handleExport = async () => {
    if (selectedKeys.size === 0) return;

    setIsExporting(true);
    try {
      const activeColumns = orderedColumns.filter((col) =>
        selectedKeys.has(col.key),
      );
      const filename = generateExportFilename(filenamePrefix, format);

      await exportData({
        data,
        columns: activeColumns,
        format,
        filename: filename.split(".")[0], // Utils handles extension
      });

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const allSelected = selectedKeys.size === orderedColumns.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] flex flex-col h-[600px] p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              <DialogTitle>Export Settings</DialogTitle>
            </div>
            <DialogDescription>
              Customize the columns, order, and file format for your download.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="h-8 px-2 text-xs font-medium"
              >
                {allSelected ? (
                  <>
                    <Square className="size-3.5 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-3.5 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetOrder}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5 mr-2" />
              Reset Order
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedColumns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {orderedColumns.map((col) => (
                  <SortableColumnItem
                    key={col.key}
                    column={col}
                    isSelected={selectedKeys.has(col.key)}
                    onToggle={toggleColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="p-6 bg-muted/30 border-t space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="export-format" className="text-sm font-semibold">
                File Format
              </Label>
              <p className="text-[12px] text-muted-foreground">
                Select your preferred document type
              </p>
            </div>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger
                className="w-[140px] bg-background"
                id="export-format"
              >
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={selectedKeys.size === 0 || isExporting}
              className="flex-1 sm:flex-none min-w-[140px]"
            >
              {isExporting ? (
                "Processing..."
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  Download ({selectedKeys.size})
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
