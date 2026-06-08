"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { FileUp, TableProperties } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CsvPreview = {
  columns: string[];
  rows: string[][];
};

const expectedBomColumns = [
  "part_number",
  "description",
  "qty_per_build",
  "material_variant",
  "process_route",
];

export function BomCsvImportPanel() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvPreview>({
    columns: [],
    rows: [],
  });

  const mapping = useMemo(
    () =>
      expectedBomColumns.map((expected) => {
        const matched =
          preview.columns.find(
            (column) => normalizeColumn(column) === normalizeColumn(expected),
          ) ?? "";

        return {
          expected,
          matched,
          status: matched ? "Mapped" : "Missing",
        };
      }),
    [preview.columns],
  );
  const missingCount = mapping.filter((item) => !item.matched).length;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setPreview({ columns: [], rows: [] });
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const parsed = parseCsvPreview(text);
    setPreview(parsed);
  }

  return (
    <div className="grid gap-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center transition-colors hover:border-sky-400 hover:bg-sky-50/60">
        <FileUp className="size-8 text-sky-700" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-950">
          Drop or choose a BOM CSV
        </span>
        <span className="max-w-md text-sm text-slate-500">
          Preview part rows and validate the minimum fields needed for matrix
          process/material planning.
        </span>
        <Input
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleFileChange}
          type="file"
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Column mapping</div>
              <p className="mt-1 text-xs text-slate-500">
                {fileName || "No CSV selected"}
              </p>
            </div>
            <Badge variant={missingCount === 0 ? "secondary" : "destructive"}>
              {missingCount === 0 ? "Ready" : `${missingCount} missing`}
            </Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {mapping.map((item) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-xs"
                key={item.expected}
              >
                <span className="font-medium text-slate-700">
                  {item.expected}
                </span>
                <span className="truncate text-slate-500">
                  {item.matched || "not mapped"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TableProperties className="size-4 text-slate-500" />
              <div className="text-sm font-medium">Preview rows</div>
            </div>
            <span className="text-xs text-slate-500">
              {preview.rows.length} preview row
              {preview.rows.length === 1 ? "" : "s"}
            </span>
          </div>
          {preview.columns.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
              Select a CSV to preview the first rows before import.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.columns.slice(0, 6).map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, index) => (
                  <TableRow key={`${index}-${row.join("-")}`}>
                    {preview.columns.slice(0, 6).map((column, cellIndex) => (
                      <TableCell key={column}>
                        {row[cellIndex] || (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function parseCsvPreview(text: string): CsvPreview {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const [header, ...rows] = lines;

  return {
    columns: parseCsvLine(header),
    rows: rows.slice(0, 5).map(parseCsvLine),
  };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeColumn(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}
