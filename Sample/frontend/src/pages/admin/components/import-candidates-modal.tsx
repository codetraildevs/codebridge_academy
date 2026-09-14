import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { adminService } from '@services/admin-service';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Ban,
  Users,
  GripVertical,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface ParsedRow {
  row: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tradeId: string;
  registrationNumber: string;
  _valid: boolean;
  _error?: string;
}

interface ImportResult {
  row: number;
  email: string;
  status: 'created' | 'skipped' | 'error';
  message?: string;
}

type ColumnMapping = {
  email: number | null;
  firstName: number | null;
  lastName: number | null;
  phone: number | null;
  tradeId: number | null;
  registrationNumber: number | null;
};

interface TargetField {
  key: string;
  label: string;
  required: boolean;
  description: string;
  color: string;
}

const TARGET_FIELDS: TargetField[] = [
  { key: 'email', label: 'Email', required: true, description: 'Candidate email address', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'firstName', label: 'First Name', required: true, description: 'Candidate first name', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'lastName', label: 'Last Name', required: true, description: 'Candidate last name', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'phone', label: 'Phone', required: false, description: 'Candidate phone number', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'tradeId', label: 'Trade / Program', required: false, description: 'Trade or program ID', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'registrationNumber', label: 'Reg. Number', required: false, description: 'Custom registration number', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

// ── Helpers ─────────────────────────────────────────────────────────

function normaliseKey(key: string): string {
  return key.replace(/[\s_-]+/g, '').toLowerCase();
}

function findHeaderIndex(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = normaliseKey(h);
    if (key) map[key] = i;
  });
  return map;
}

function resolveColumns(map: Record<string, number>) {
  return {
    email: findHeaderIndex(Object.keys(map), 'email'),
    firstName: findHeaderIndex(Object.keys(map), 'firstname', 'first_name', 'first'),
    lastName: findHeaderIndex(Object.keys(map), 'lastname', 'last_name', 'last'),
    phone: findHeaderIndex(Object.keys(map), 'phone', 'phonenumber', 'phone_number', 'mobile'),
    tradeId: findHeaderIndex(Object.keys(map), 'tradeid', 'trade_id', 'trade', 'tradename', 'trade_name'),
    registrationNumber: findHeaderIndex(Object.keys(map), 'registrationnumber', 'registration_number', 'regnumber', 'reg_number', 'regno'),
  };
}

function validateRow(email: string, firstName: string, lastName: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email';
  if (!firstName) return 'Missing first name';
  if (!lastName) return 'Missing last name';
  return null;
}

/** Build a default auto-detected mapping from file headers to target fields. */
function autoDetectMapping(fileHeaders: string[]): ColumnMapping {
  const normalised = fileHeaders.map((h) => normaliseKey(h));
  const map = buildHeaderMap(normalised);
  const cols = resolveColumns(map);
  return {
    email: cols.email !== -1 ? cols.email : null,
    firstName: cols.firstName !== -1 ? cols.firstName : null,
    lastName: cols.lastName !== -1 ? cols.lastName : null,
    phone: cols.phone !== -1 ? cols.phone : null,
    tradeId: cols.tradeId !== -1 ? cols.tradeId : null,
    registrationNumber: cols.registrationNumber !== -1 ? cols.registrationNumber : null,
  };
}

/** Parse raw rows using a custom column mapping. */
function parseRowsWithMapping(
  rawRows: string[][],
  mapping: ColumnMapping,
  rowOffset: number,
): ParsedRow[] {
  const parsed: ParsedRow[] = [];
  for (let i = 0; i < rawRows.length && parsed.length < 1000; i++) {
    const values = rawRows[i]!;
    const getVal = (idx: number | null) => (idx !== null && idx < values.length ? (values[idx] ?? '').trim() : '');

    const email = getVal(mapping.email);
    const firstName = getVal(mapping.firstName);
    const lastName = getVal(mapping.lastName);

    const row: ParsedRow = {
      row: rowOffset + i + 1,
      email,
      firstName,
      lastName,
      phone: getVal(mapping.phone),
      tradeId: getVal(mapping.tradeId),
      registrationNumber: getVal(mapping.registrationNumber),
      _valid: true,
    };

    const error = validateRow(email, firstName, lastName);
    if (error) {
      row._valid = false;
      row._error = error;
    }
    parsed.push(row);
  }
  return parsed;
}

// ── Component ──────────────────────────────────────────────────────

export function ImportCandidatesModal({ isOpen, onClose, onImportComplete }: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawDataRows, setRawDataRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: null,
    firstName: null,
    lastName: null,
    phone: null,
    tradeId: null,
    registrationNumber: null,
  });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importError, setImportError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFileHeaders([]);
    setRawDataRows([]);
    setColumnMapping({ email: null, firstName: null, lastName: null, phone: null, tradeId: null, registrationNumber: null });
    setParsedRows([]);
    setImportResults([]);
    setImportError('');
    setShowErrors(false);
    setFileName('');
    setDragOverTarget(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Validate mapping has required fields assigned
  const mappingValid = useMemo(() => {
    return columnMapping.email !== null && columnMapping.firstName !== null && columnMapping.lastName !== null;
  }, [columnMapping]);

  // Count mapped columns
  const mappedCount = useMemo(() => {
    return Object.values(columnMapping).filter((v) => v !== null).length;
  }, [columnMapping]);

  // ── Parsing ────────────────────────────────────────────────────

  const extractHeadersAndRaw = useCallback((headers: string[], rows: unknown[][], rowOffset: number) => {
    const rawRows: string[][] = rows.map((r) => r.map((v) => (v == null ? '' : String(v))));
    setFileHeaders(headers);
    setRawDataRows(rawRows);

    // Auto-detect mapping
    const detected = autoDetectMapping(headers);
    setColumnMapping(detected);

    // If auto-detection fails for required columns, it will be visible in mapping step
    setImportError('');
    setStep('mapping');
  }, []);

  const parseCSV = useCallback((text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      setImportError('CSV file must have a header row and at least one data row.');
      return;
    }

    const headerLine = lines[0]!;
    const headers = headerLine.split(',').map((h) => h.trim());
    const dataRows: unknown[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map((v) =>
        v.replace(/^"|"$/g, '').trim(),
      ) ?? [];
      dataRows.push(values);
    }

    extractHeadersAndRaw(headers, dataRows, 1);
  }, [extractHeadersAndRaw]);

  const parseExcel = useCallback((data: ArrayBuffer, name: string) => {
    try {
      const workbook = XLSX.read(data, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setImportError('Excel file has no sheets.');
        return;
      }
      const sheet = workbook.Sheets[sheetName]!;
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (json.length === 0) {
        setImportError('Excel sheet is empty.');
        return;
      }

      const headers = Object.keys(json[0]!);
      const dataRows: unknown[][] = json.map((row) => headers.map((h) => row[h] ?? ''));

      extractHeadersAndRaw(headers, dataRows, 1);
    } catch (err: any) {
      setImportError(`Failed to parse Excel file: ${err.message || 'Unknown error'}`);
    }
  }, [extractHeadersAndRaw]);

  // ── File handling ──────────────────────────────────────────────

  const isExcelFile = (name: string) => /\.xlsx?$/i.test(name);
  const isCSVFile = (name: string) => /\.csv$/i.test(name);

  const processFile = useCallback((file: File) => {
    const name = file.name;
    setFileName(name);
    setImportError('');

    if (isCSVFile(name)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          setImportError('Failed to read CSV file as text.');
          return;
        }
        parseCSV(text);
      };
      reader.onerror = () => setImportError('Failed to read file.');
      reader.readAsText(file);
    } else if (isExcelFile(name)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          setImportError('Failed to read Excel file.');
          return;
        }
        parseExcel(result, name);
      };
      reader.onerror = () => setImportError('Failed to read file.');
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Please select a .csv, .xlsx, or .xls file.');
    }
  }, [parseCSV, parseExcel]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  }, [processFile]);

  // ── Drag & drop mapping ────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, columnIndex: number) => {
    e.dataTransfer.setData('text/plain', String(columnIndex));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const handleDropOnTarget = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const colIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(colIndex)) {
      setColumnMapping((prev) => ({ ...prev, [targetKey]: colIndex }));
    }
  }, []);

  const removeMapping = useCallback((targetKey: string) => {
    setColumnMapping((prev) => ({ ...prev, [targetKey]: null }));
  }, []);

  const autoDetect = useCallback(() => {
    const detected = autoDetectMapping(fileHeaders);
    setColumnMapping(detected);
  }, [fileHeaders]);

  // ── Confirm mapping → parse → preview ─────────────────────────

  const confirmMapping = useCallback(() => {
    if (!mappingValid) {
      setImportError('Please map Email, First Name, and Last Name before continuing.');
      return;
    }
    const parsed = parseRowsWithMapping(rawDataRows, columnMapping, 1);
    if (parsed.length === 0) {
      setImportError('No data rows to import after mapping.');
      return;
    }
    setParsedRows(parsed);
    setImportError('');
    setStep('preview');
  }, [mappingValid, rawDataRows, columnMapping]);

  // ── Import ─────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      setImportError('No valid rows to import. Fix the errors first.');
      return;
    }

    setStep('importing');
    setImportError('');

    try {
      const result = await adminService.importCandidates({
        candidates: validRows.map((r) => ({
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          phone: r.phone || null,
          tradeId: r.tradeId || null,
          registrationNumber: r.registrationNumber || null,
        })),
      });
      setImportResults((result.results ?? []) as ImportResult[]);
      setStep('results');
    } catch (err: any) {
      setImportError(err?.response?.data?.message || err?.message || 'Import failed. Please try again.');
      setStep('preview');
    }
  }, [parsedRows]);

  // ── Templates ──────────────────────────────────────────────────

  const downloadTemplateCSV = useCallback(() => {
    const header = 'email,firstName,lastName,phone,tradeId,registrationNumber';
    const sample = 'john@example.com,John,Doe,+250788123456,,CAND-001';
    const blob = new Blob([`${header}\n${sample}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadTemplateExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['email', 'firstName', 'lastName', 'phone', 'tradeId', 'registrationNumber'],
      ['john@example.com', 'John', 'Doe', '+250788123456', '', 'CAND-001'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const validCount = parsedRows.filter((r) => r._valid).length;
  const errorCount = parsedRows.filter((r) => !r._valid).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            {/* ── Header ────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {step === 'upload' && 'Import Candidates'}
                    {step === 'mapping' && 'Map Columns'}
                    {step === 'preview' && 'Review Data'}
                    {step === 'importing' && 'Importing...'}
                    {step === 'results' && 'Import Complete'}
                  </h2>
                  <p className="text-sm text-text-tertiary">
                    {step === 'upload' && 'Upload a CSV or Excel file to bulk register candidates'}
                    {step === 'mapping' && `Match ${fileHeaders.length} file column(s) to candidate fields`}
                    {step === 'preview' && `${parsedRows.length} candidate(s) from ${fileName}`}
                    {step === 'importing' && 'Processing candidates...'}
                    {step === 'results' && `${importResults.filter((r) => r.status === 'created').length} created`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Body ──────────────────────────────────────────── */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {step === 'upload' && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-secondary p-10 transition-all hover:border-primary-300 hover:bg-primary-50/30"
                  >
                    <FileSpreadsheet className="h-12 w-12 text-primary-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-primary">
                        Click to upload or drag & drop your file
                      </p>
                      <p className="mt-1 text-xs text-text-tertiary">
                        .csv, .xlsx, .xls  &middot;  up to 1000 rows
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* Template download */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={downloadTemplateCSV}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Download CSV template
                    </button>
                    <span className="text-text-tertiary text-xs">|</span>
                    <button
                      onClick={downloadTemplateExcel}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Download Excel template
                    </button>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}
                </div>
              )}

              {step === 'mapping' && (
                <div className="space-y-5">
                  {/* Instructions */}
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-text-secondary">
                      Drag file columns onto target fields or use the dropdown to map each column. Required fields are marked with <span className="text-error">*</span>.
                    </p>
                    <button
                      onClick={autoDetect}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-detect
                    </button>
                  </div>

                  {/* Source columns (draggable chips) */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      File Columns <span className="text-text-quaternary">— Drag a chip onto a field below</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fileHeaders.map((header, idx) => {
                        // Check if this column is already mapped somewhere
                        const mappedTo = Object.entries(columnMapping).find(([, v]) => v === idx)?.[0];
                        return (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            className={`group inline-flex cursor-grab items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all active:cursor-grabbing ${
                              mappedTo
                                ? 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                                : 'border-border bg-surface-secondary text-text-primary hover:border-primary-300 hover:bg-primary-50/50'
                            }`}
                          >
                            <GripVertical className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                            {header}
                            {mappedTo && (
                              <span className="ml-1 text-[10px] font-normal text-primary-500">
                                → {TARGET_FIELDS.find((f) => f.key === mappedTo)?.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target fields (drop zones) */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Candidate Fields</p>
                    {TARGET_FIELDS.map((field) => {
                      const mappedColIndex = columnMapping[field.key as keyof ColumnMapping];
                      const mappedHeader = mappedColIndex !== null ? fileHeaders[mappedColIndex] : null;
                      const isOver = dragOverTarget === field.key;

                      return (
                        <div
                          key={field.key}
                          onDragOver={(e) => handleDragOver(e, field.key)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropOnTarget(e, field.key)}
                          className={`relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                            isOver
                              ? 'border-primary-400 bg-primary-50 shadow-elevation-low'
                              : mappedHeader
                                ? 'border-border bg-white'
                                : 'border-dashed border-border bg-surface-secondary'
                          }`}
                        >
                          {/* Field indicator */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${field.color}`}>
                            {field.required ? (
                              <span className="relative">
                                {field.key === 'email' ? '@' : field.key === 'firstName' ? 'F' : 'L'}
                                <span className="absolute -right-1.5 -top-1.5 text-[9px] text-error">*</span>
                              </span>
                            ) : (
                              <span>{field.key === 'phone' ? '📞' : field.key === 'tradeId' ? '⚙' : '#'}</span>
                            )}
                          </div>

                          {/* Label + description */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">{field.label}</span>
                              {field.required && <span className="text-[10px] text-error font-medium">Required</span>}
                            </div>
                            <p className="text-xs text-text-tertiary">{field.description}</p>
                          </div>

                          {/* Mapped value or drop hint + dropdown selector */}
                          <div className="flex shrink-0 items-center gap-2">
                            {/* Dropdown selector (accessible alternative) */}
                            <select
                              value={mappedColIndex ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [field.key]: val === '' ? null : parseInt(val, 10),
                                }));
                              }}
                              className="max-w-[140px] rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium text-text-primary focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none transition-colors cursor-pointer"
                              aria-label={`Map column to ${field.label}`}
                            >
                              <option value="">— Not mapped —</option>
                              {fileHeaders.map((header, idx) => (
                                <option key={idx} value={idx}>
                                  {header} (Col {idx + 1})
                                </option>
                              ))}
                            </select>

                            {mappedHeader ? (
                              <>
                                <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                                  <span>{mappedHeader}</span>
                                  <span className="text-primary-300">·</span>
                                  <span className="font-mono text-primary-500">Col {mappedColIndex! + 1}</span>
                                </div>
                                <button
                                  onClick={() => removeMapping(field.key)}
                                  className="rounded p-1 text-text-tertiary hover:bg-error/10 hover:text-error transition-colors"
                                  title="Remove mapping"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="hidden sm:inline text-xs text-text-quaternary italic">
                                {isOver ? 'Drop here' : 'Drag here'}
                              </span>
                            )}
                          </div>

                          {/* Drop indicator line */}
                          {isOver && (
                            <motion.div
                              layoutId="drop-indicator"
                              className="absolute inset-0 rounded-xl border-2 border-primary-400 pointer-events-none"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mapping summary */}
                  <div className="flex items-center justify-between rounded-lg bg-surface-tertiary px-4 py-2.5 text-xs text-text-secondary">
                    <span>
                      {mappedCount} of {TARGET_FIELDS.length} fields mapped
                      {!mappingValid && (
                        <span className="ml-2 text-error">— Required fields missing</span>
                      )}
                    </span>
                    <span className="text-text-tertiary">{fileHeaders.length} file column(s)</span>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-success/10 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-sm font-semibold text-text-primary">{validCount} Valid</span>
                      </div>
                    </div>
                    {errorCount > 0 && (
                      <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="rounded-xl bg-error/10 p-3 text-left transition-colors hover:bg-error/15"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-error" />
                          <span className="text-sm font-semibold text-text-primary">{errorCount} Errors</span>
                          {showErrors ? <ChevronUp className="ml-auto h-4 w-4 text-text-tertiary" /> : <ChevronDown className="ml-auto h-4 w-4 text-text-tertiary" />}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Error details */}
                  {showErrors && errorCount > 0 && (
                    <div className="rounded-xl border border-error/20 bg-error/5 p-3">
                      <p className="text-xs font-medium text-error mb-2">Rows with errors:</p>
                      <div className="space-y-1.5">
                        {parsedRows.filter((r) => !r._valid).map((r) => (
                          <div key={r.row} className="flex items-center gap-2 text-xs text-text-secondary">
                            <Ban className="h-3 w-3 text-error shrink-0" />
                            <span className="font-mono">Row {r.row}:</span>
                            <span className="text-text-tertiary">{r.email}</span>
                            <span className="ml-auto text-error">{r._error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview table */}
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-surface-tertiary">
                          <tr>
                            <th className="px-3 py-2 font-medium text-text-secondary">#</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Email</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">First Name</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Last Name</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Phone</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((r) => (
                            <tr key={r.row} className="border-t border-border transition-colors hover:bg-surface-secondary">
                              <td className="px-3 py-2 font-mono text-text-tertiary">{r.row}</td>
                              <td className="px-3 py-2 text-text-primary">{r.email}</td>
                              <td className="px-3 py-2 text-text-primary">{r.firstName}</td>
                              <td className="px-3 py-2 text-text-primary">{r.lastName}</td>
                              <td className="px-3 py-2 text-text-tertiary">{r.phone || '—'}</td>
                              <td className="px-3 py-2">
                                {r._valid ? (
                                  <span className="inline-flex items-center gap-1 text-success">
                                    <CheckCircle2 className="h-3 w-3" />
                                    OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-error" title={r._error}>
                                    <AlertCircle className="h-3 w-3" />
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}
                </div>
              )}

              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
                  <p className="mt-4 text-sm font-medium text-text-primary">Importing {validCount} candidate(s)...</p>
                  <p className="mt-1 text-xs text-text-tertiary">Creating user accounts and candidate profiles</p>
                </div>
              )}

              {step === 'results' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-success/10 p-4 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                      <p className="mt-2 text-2xl font-bold text-text-primary">
                        {importResults.filter((r) => r.status === 'created').length}
                      </p>
                      <p className="text-xs text-text-secondary">Created</p>
                    </div>
                    <div className="rounded-xl bg-warning/10 p-4 text-center">
                      <Ban className="mx-auto h-6 w-6 text-warning" />
                      <p className="mt-2 text-2xl font-bold text-text-primary">
                        {importResults.filter((r) => r.status === 'skipped').length}
                      </p>
                      <p className="text-xs text-text-secondary">Skipped</p>
                    </div>
                    <div className="rounded-xl bg-error/10 p-4 text-center">
                      <AlertCircle className="mx-auto h-6 w-6 text-error" />
                      <p className="mt-2 text-2xl font-bold text-text-primary">
                        {importResults.filter((r) => r.status === 'error').length}
                      </p>
                      <p className="text-xs text-text-secondary">Errors</p>
                    </div>
                  </div>

                  {importResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-surface-tertiary">
                          <tr>
                            <th className="px-3 py-2 font-medium text-text-secondary">Row</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Email</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Status</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResults.map((r) => (
                            <tr key={r.row} className="border-t border-border">
                              <td className="px-3 py-2 font-mono text-text-tertiary">{r.row}</td>
                              <td className="px-3 py-2 text-text-primary">{r.email}</td>
                              <td className="px-3 py-2">
                                {r.status === 'created' && (
                                  <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Created</span>
                                )}
                                {r.status === 'skipped' && (
                                  <span className="inline-flex items-center gap-1 text-warning"><Ban className="h-3 w-3" /> Skipped</span>
                                )}
                                {r.status === 'error' && (
                                  <span className="inline-flex items-center gap-1 text-error"><AlertCircle className="h-3 w-3" /> Error</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-text-tertiary">{r.message || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              {step === 'upload' && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
                  <div />
                </>
              )}
              {step === 'mapping' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={confirmMapping}
                    disabled={!mappingValid}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Review Data
                  </Button>
                </>
              )}
              {step === 'preview' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setStep('mapping')}>
                    <ChevronDown className="mr-1.5 h-4 w-4 rotate-90" />
                    Back to Mapping
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleImport}
                    disabled={validCount === 0}
                    icon={<Users className="h-4 w-4" />}
                  >
                    Import {validCount} Candidate{validCount !== 1 ? 's' : ''}
                  </Button>
                </>
              )}
              {step === 'importing' && (
                <div className="w-full text-center text-xs text-text-tertiary">Please wait...</div>
              )}
              {step === 'results' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { reset(); }}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Import Another File
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => { onImportComplete(); handleClose(); }}>
                    Done
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ImportCandidatesModal;
