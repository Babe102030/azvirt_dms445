import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ExportFormat,
  ExportColumn,
  exportData,
  generateExportFilename
} from "@/lib/exportUtils";
import {
  GripVertical,
  Download,
  Check,
  X
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Interface for the ExportDialog props
 */
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
  onToggle
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
    isDragging
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 mb-2 rounded-md border bg-card transition-shadow ${
        isDragging ? "shadow-md ring-1 ring-primary/20" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary active:cursor-grabbing"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-2 flex-1">
        <Checkbox
          id={`col-${column.key}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(column.key)}
        />
        <Label
          htmlFor={`col-${column.key}`}
          className="text-sm font-medium cursor-pointer flex-1"
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
  filenamePrefix = "data"
}: ExportDialogProps<T>) {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    new Set(initialColumns.map(c => c.key))
  );
  const [orderedColumns, setOrderedColumns] = React.useState<ExportColumn[]>(initialColumns);
  const [format, setFormat] = React.useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = React.useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  const handleExport = async () => {
    if (selectedKeys.size === 0) return;

    setIsExporting(true);
    try {
      const activeColumns = orderedColumns.filter(col => selectedKeys.has(col.key));
      const filename = generateExportFilename(filenamePrefix, format);

      await exportData({
        data,
        columns: activeColumns,
        format,
        filename: filename.replace(`.${format}`, '') // Utils appends extension
      });

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose columns and format for your export. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                Column Selection & Order
              </Label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedColumns.map(c => c.key)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedColumns.map((col) => (
                    <SortableColumnItem
                      key={col.key}
                      column={col}
                      isSelected={selectedKeys.has(col.key)}
                      onToggle={toggleColumn}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="export-format">File Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger className="w-[180px]" id="export-format">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={selectedKeys.size === 0 || isExporting}
            >
              {isExporting ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {selectedKeys.size} Fields
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
