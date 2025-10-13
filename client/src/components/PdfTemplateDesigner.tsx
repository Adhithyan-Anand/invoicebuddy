import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ElementType = "text" | "field";

export type TemplateElement = {
  id: string;
  type: ElementType;
  x: number; // canvas px
  y: number; // canvas px
  width?: number; // optional text wrapping width
  value?: string; // for type === "text"
  fieldKey?: string; // for type === "field"
  style?: {
    fontSize?: number;
    color?: string;
    fontWeight?: "normal" | "bold";
  };
};

export type TemplateLayout = {
  elements: TemplateElement[];
};

export type PdfTemplateDesignerProps = {
  value?: TemplateLayout | null;
  onChange?: (layout: TemplateLayout) => void;
  docType?: "invoice" | "quotation";
};

const CANVAS_WIDTH = 794;  // ~A4 width @ 96dpi
const CANVAS_HEIGHT = 1123; // ~A4 height @ 96dpi

// Available dynamic fields for binding
const INVOICE_FIELDS = [
  { key: "company.name", label: "Company Name" },
  { key: "company.address", label: "Company Address" },
  { key: "company.phone", label: "Company Phone" },
  { key: "company.email", label: "Company Email" },
  { key: "customer.name", label: "Customer Name" },
  { key: "customer.company", label: "Customer Company" },
  { key: "customer.address", label: "Customer Address" },
  { key: "customer.phone", label: "Customer Phone" },
  { key: "customer.email", label: "Customer Email" },
  { key: "invoice.invoiceNumber", label: "Invoice Number" },
  { key: "invoice.date", label: "Invoice Date" },
  { key: "invoice.dueDate", label: "Due Date" },
  { key: "invoice.subtotal", label: "Subtotal" },
  { key: "invoice.taxAmount", label: "Tax Amount" },
  { key: "invoice.total", label: "Total" },
  { key: "invoice.notes", label: "Notes" },
];

const QUOTATION_FIELDS = [
  { key: "company.name", label: "Company Name" },
  { key: "company.address", label: "Company Address" },
  { key: "company.phone", label: "Company Phone" },
  { key: "company.email", label: "Company Email" },
  { key: "customer.name", label: "Customer Name" },
  { key: "customer.company", label: "Customer Company" },
  { key: "customer.address", label: "Customer Address" },
  { key: "customer.phone", label: "Customer Phone" },
  { key: "customer.email", label: "Customer Email" },
  { key: "quotation.quotationNumber", label: "Quotation Number" },
  { key: "quotation.date", label: "Quotation Date" },
  { key: "quotation.validUntil", label: "Valid Until" },
  { key: "quotation.subtotal", label: "Subtotal" },
  { key: "quotation.taxAmount", label: "Tax Amount" },
  { key: "quotation.total", label: "Total" },
  { key: "quotation.notes", label: "Notes" },
];

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PdfTemplateDesigner(props: PdfTemplateDesignerProps) {
  const { value, onChange, docType = "invoice" } = props;
  const [layout, setLayout] = useState<TemplateLayout>(() => value ?? { elements: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (value) setLayout(value);
  }, [value]);

  const selected = useMemo(
    () => layout.elements.find((e) => e.id === selectedId) || null,
    [layout.elements, selectedId]
  );

  const fields = docType === "quotation" ? QUOTATION_FIELDS : INVOICE_FIELDS;

  const updateLayout = useCallback(
    (updater: (prev: TemplateLayout) => TemplateLayout) => {
      setLayout((prev) => {
        const next = updater(prev);
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  const addText = () => {
    const el: TemplateElement = {
      id: uuid(),
      type: "text",
      x: 60,
      y: 60,
      width: 200,
      value: "Sample Text",
      style: { fontSize: 14, color: "#000000", fontWeight: "normal" },
    };
    updateLayout((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
  };

  const addField = (fieldKey: string) => {
    if (!fieldKey) return;
    const field = fields.find((f) => f.key === fieldKey);
    const el: TemplateElement = {
      id: uuid(),
      type: "field",
      x: 60,
      y: 120,
      width: 240,
      fieldKey,
      style: { fontSize: 14, color: "#000000", fontWeight: "normal" },
      value: field?.label || fieldKey,
    };
    updateLayout((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    updateLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== selectedId),
    }));
    setSelectedId(null);
  };

  // Dragging
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      updateLayout((prev) => {
        const elements = prev.elements.map((el) => {
          if (el.id !== d.id) return el;
          return {
            ...el,
            x: Math.max(0, Math.min(CANVAS_WIDTH - 10, d.originX + dx)),
            y: Math.max(0, Math.min(CANVAS_HEIGHT - 10, d.originY + dy)),
          };
        });
        return { ...prev, elements };
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    if (dragRef.current) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateLayout]);

  const onElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const el = layout.elements.find((x) => x.id === id);
    if (!el) return;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originX: el.x,
      originY: el.y,
    };
  };

  const onCanvasClick = () => {
    setSelectedId(null);
  };

  // Property panel handlers
  const updateSelected = (patch: Partial<TemplateElement>) => {
    if (!selectedId) return;
    updateLayout((prev) => {
      const elements = prev.elements.map((e) => (e.id === selectedId ? { ...e, ...patch, style: { ...e.style, ...(patch.style || {}) } } : e));
      return { ...prev, elements };
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-3 py-2 rounded border bg-white hover:bg-slate-50"
          onClick={addText}
        >
          Add Text
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm">Add Field</label>
          <select
            className="border rounded px-2 py-1"
            onChange={(e) => {
              addField(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
          >
            <option value="">Select field...</option>
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded border bg-white hover:bg-slate-50"
            onClick={removeSelected}
            disabled={!selectedId}
            title="Delete selected"
          >
            Delete Selected
          </button>
        </div>
      </div>

      {/* Canvas + Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canvas */}
        <div className="md:col-span-2">
          <div
            ref={canvasRef}
            onClick={onCanvasClick}
            className="border bg-white overflow-auto"
            style={{
              width: "100%",
              maxWidth: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              position: "relative",
              boxShadow: "0 0 0 1px #e2e8f0 inset",
            }}
          >
            {/* Canvas area (A4) */}
            <div
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                position: "relative",
              }}
            >
              {layout.elements.map((el) => {
                const isSelected = el.id === selectedId;
                const fontSize = el.style?.fontSize ?? 14;
                const color = el.style?.color ?? "#000000";
                const fontWeight = el.style?.fontWeight ?? "normal";
                const displayText =
                  el.type === "text"
                    ? el.value ?? ""
                    : el.value ?? el.fieldKey ?? "";
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => onElementMouseDown(e, el.id)}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width || "auto",
                      cursor: "move",
                      userSelect: "none",
                      border: isSelected ? "1px dashed #2563eb" : "1px dashed transparent",
                      padding: 2,
                      background: isSelected ? "rgba(37,99,235,0.05)" : "transparent",
                      color,
                      fontSize,
                      fontWeight,
                      whiteSpace: "pre-wrap",
                    }}
                    title="Drag to move"
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Tip: Click an element to select it. Drag to move. Use the inspector to edit text, style, width and bindings. Coordinates are in pixels on an A4 canvas.
          </div>
        </div>

        {/* Inspector */}
        <div className="space-y-3">
          <div className="border rounded p-3 bg-white">
            <div className="font-medium mb-2">Inspector</div>
            {selected ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-slate-600">Type</label>
                  <div className="text-sm">{selected.type}</div>

                  <label className="text-sm text-slate-600">X</label>
                  <input
                    className="border rounded px-2 py-1"
                    type="number"
                    value={selected.x}
                    onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })}
                  />

                  <label className="text-sm text-slate-600">Y</label>
                  <input
                    className="border rounded px-2 py-1"
                    type="number"
                    value={selected.y}
                    onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })}
                  />

                  <label className="text-sm text-slate-600">Width</label>
                  <input
                    className="border rounded px-2 py-1"
                    type="number"
                    value={selected.width ?? 240}
                    onChange={(e) => updateSelected({ width: Number(e.target.value) || 0 })}
                  />

                  <label className="text-sm text-slate-600">Font Size</label>
                  <input
                    className="border rounded px-2 py-1"
                    type="number"
                    value={selected.style?.fontSize ?? 14}
                    onChange={(e) =>
                      updateSelected({ style: { ...selected.style, fontSize: Number(e.target.value) || 12 } })
                    }
                  />

                  <label className="text-sm text-slate-600">Color</label>
                  <input
                    className="border rounded px-2 py-1"
                    type="color"
                    value={selected.style?.color ?? "#000000"}
                    onChange={(e) =>
                      updateSelected({ style: { ...selected.style, color: e.target.value } })
                    }
                  />

                  <label className="text-sm text-slate-600">Bold</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={selected.style?.fontWeight ?? "normal"}
                    onChange={(e) =>
                      updateSelected({ style: { ...selected.style, fontWeight: e.target.value as "normal" | "bold" } })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>

                {selected.type === "text" ? (
                  <>
                    <label className="text-sm text-slate-600">Text</label>
                    <textarea
                      className="border rounded px-2 py-1 w-full min-h-[80px]"
                      value={selected.value ?? ""}
                      onChange={(e) => updateSelected({ value: e.target.value })}
                    />
                  </>
                ) : null}

                {selected.type === "field" ? (
                  <>
                    <label className="text-sm text-slate-600">Field Binding</label>
                    <select
                      className="border rounded px-2 py-1 w-full"
                      value={selected.fieldKey ?? ""}
                      onChange={(e) => updateSelected({ fieldKey: e.target.value })}
                    >
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.key})
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-500">
                      The element will render the value of the selected field in the PDF (e.g., invoice.total).
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No element selected</div>
            )}
          </div>

          <div className="border rounded p-3 bg-white">
            <div className="font-medium mb-2">Canvas</div>
            <div className="text-xs text-slate-600">A4 (px): {CANVAS_WIDTH} x {CANVAS_HEIGHT}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
