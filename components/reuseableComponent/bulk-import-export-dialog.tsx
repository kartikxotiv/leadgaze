"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  Download,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";

// Types
export interface ImportResult {
  successful: number;
  failed: number;
  duplicates: number;
  errors: string[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
}

export interface BulkImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;

  // Import Configuration
  importFields: FieldDefinition[];
  importApiEndpoint: string;
  importSampleData?: any[][]; // Sample data for template generation
  importFileName?: string; // e.g., "sales-contacts"

  // Export Configuration
  exportData?: any[]; // Data to export
  exportFields: FieldDefinition[];
  exportFileName?: string; // e.g., "sales-contacts"
  exportDataTransform?: (row: any) => any[] | Record<string, any>; // Transform function for export

  // Additional props
  workspaceId?: string;
  organizationId?: string;
  onImportComplete?: (results: ImportResult) => void;
  onExportComplete?: () => void;
  token?: string;
  initialTab?: "import" | "export";
}

export function BulkImportExportDialog({
  open,
  onOpenChange,
  title,
  description = "Import or export data using CSV or Excel files",
  importFields,
  importApiEndpoint,
  importSampleData,
  importFileName = "data",
  exportData = [],
  exportFields,
  exportFileName = "data",
  exportDataTransform,
  workspaceId,
  organizationId,
  onImportComplete,
  onExportComplete,
  token,
  initialTab = "import",
}: BulkImportExportDialogProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Simplified Import States
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  // Export States
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("excel");
  const [isExporting, setIsExporting] = useState(false);

  const { token: authToken } = useAuthStore();
  const effectiveToken = token || authToken;

  // Auto-map and transform row data
  const transformRowData = useCallback(
    (row: any, headers: string[]) => {
      const normalize = (s: string) =>
        (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const transformedData: any = {};

      importFields.forEach((field) => {
        const normKey = normalize(field.key);
        const normLabel = normalize(field.label);

        // Find matching header
        const matchingHeader = headers.find((header) => {
          const normHeader = normalize(header);
          return (
            normHeader.includes(normKey) ||
            normHeader.includes(normLabel) ||
            normKey.includes(normHeader) ||
            normLabel.includes(normHeader)
          );
        });

        if (matchingHeader) {
          const value = row[matchingHeader];
          // Preserve the actual value (including 0 and numbers) instead of defaulting to ""
          // Convert to string for phone numbers to ensure proper handling
          if (value !== undefined && value !== null) {
            transformedData[field.key] = String(value);
          } else {
            transformedData[field.key] = "";
          }
        }
      });

      return transformedData;
    },
    [importFields],
  );

  // Start import directly after parsing
  const startImport = useCallback(
    async (parsedData: any[], headers: string[]) => {
      if (!effectiveToken) {
        toast.error("Authentication required");
        return;
      }

      setIsImporting(true);
      setImportProgress(0);

      try {
        // Transform all rows using auto-mapping
        const totalRows = parsedData.length;
        const rows: any[] = [];

        parsedData.forEach((row, index) => {
          const transformedRow = transformRowData(row, headers);
          rows.push(transformedRow);

          // Update progress based on transformation (0-50%)
          const transformProgress = Math.round(((index + 1) / totalRows) * 50);
          setImportProgress(transformProgress);
        });

        setImportProgress(60);

        // Send to API
        const requestBody: any = {
          rows,
        };

        if (workspaceId) requestBody.workspaceId = workspaceId;
        if (organizationId) requestBody.organizationId = organizationId;

        setImportProgress(70);

        const res = await fetch(importApiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        setImportProgress(90);

        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Import failed");
        }

        const result: ImportResult = data.data || {
          successful: 0,
          failed: 0,
          duplicates: 0,
          errors: [],
        };

        setImportProgress(100);
        setImportResults(result);
        onImportComplete?.(result);

        toast.success(
          `Import completed! ${result.successful} records imported, ${result.failed} failed, ${result.duplicates} duplicates.`,
        );
      } catch (e: any) {
        toast.error(e?.message || "Import failed");
        setIsImporting(false);
        setImportProgress(0);
      } finally {
        setIsImporting(false);
      }
    },
    [
      effectiveToken,
      workspaceId,
      organizationId,
      importApiEndpoint,
      transformRowData,
      onImportComplete,
    ],
  );

  // Simplified File Parsing - Direct Import
  const parseFile = useCallback(
    async (file: File) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "csv") {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              toast.error("Error parsing CSV file");
              return;
            }
            const parsedData = results.data;
            const headers = results.meta.fields || [];
            startImport(parsedData, headers);
          },
          error: (error) => {
            toast.error(`Error reading CSV file: ${error.message}`);
          },
        });
      } else if (["xls", "xlsx"].includes(fileExtension || "")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            toast.error("Excel file appears to be empty");
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];

          const parsedData = rows.map((row) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          startImport(parsedData, headers);
        } catch (error) {
          toast.error(
            `Error reading Excel file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
        }
      } else {
        toast.error(
          "Unsupported file format. Please upload CSV or Excel files.",
        );
      }
    },
    [startImport],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && !isImporting) {
        setFile(file);
        setImportResults(null);
        setImportProgress(0);
        parseFile(file);
      }
    },
    [parseFile, isImporting],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: isImporting,
  });

  const downloadSampleTemplate = () => {
    if (!importSampleData || importSampleData.length === 0) {
      toast.error("Sample template not available");
      return;
    }

    const headers = importFields.map((f) => f.label);
    const data = [headers, ...importSampleData];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${importFileName}-template.xlsx`);
  };

  const handleExport = useCallback(() => {
    if (!exportData || exportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    setIsExporting(true);

    try {
      const headers = exportFields.map((f) => f.label);

      let data: any[][];
      if (exportDataTransform) {
        data = exportData.map((row) => {
          const transformed = exportDataTransform(row);
          if (Array.isArray(transformed)) {
            return transformed;
          }
          // If it's an object, map it to the exportFields in order
          return exportFields.map((field) => {
            const value = transformed[field.key];
            return value !== undefined && value !== null ? String(value) : "";
          });
        });
      } else {
        data = exportData.map((row) => {
          return exportFields.map((field) => {
            const value = row[field.key];
            return value !== undefined && value !== null ? String(value) : "";
          });
        });
      }

      const fileName = `${exportFileName}-export-${
        new Date().toISOString().split("T")[0]
      }`;

      if (exportFormat === "csv") {
        const csvContent = [headers, ...data]
          .map((row) =>
            row
              .map((field) => `"${String(field).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Export");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }

      toast.success(
        `Data exported as ${exportFormat.toUpperCase()} successfully!`,
      );
      onExportComplete?.();
    } catch (error) {
      toast.error(
        `Export failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    exportData,
    exportFields,
    exportFormat,
    exportFileName,
    exportDataTransform,
    onExportComplete,
  ]);

  const resetDialog = () => {
    setFile(null);
    setIsImporting(false);
    setImportProgress(0);
    setImportResults(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetDialog();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeTab === "import" ? (
              <Upload className="h-5 w-5" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "import" | "export")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* SIMPLIFIED IMPORT TAB */}
          <TabsContent value="import" className="space-y-6">
            {/* Upload Area */}
            {!isImporting && !importResults && (
              <div className="space-y-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400",
                    isImporting && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <input {...getInputProps()} />
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop your CSV or Excel file here
                      </p>
                      <p className="text-gray-500 mb-4">
                        or click to browse files
                      </p>
                      <Button variant="outline" disabled={isImporting}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-xs">Supported formats:</h4>
                    <p className="text-xs text-gray-500">
                      CSV, Excel (.xls, .xlsx)
                    </p>
                  </div>
                  {importSampleData && importSampleData.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={downloadSampleTemplate}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  )}
                </div>

                {file && !isImporting && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setFile(null);
                            setImportResults(null);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Importing with Progress */}
            {isImporting && (
              <div className="space-y-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
                  <h3 className="text-lg font-semibold">Importing Data...</h3>
                  <p className="text-sm text-gray-500">
                    Please wait while we process your file
                  </p>
                </div>
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">
                      {Math.round(importProgress)}% complete
                    </p>
                    {file && (
                      <p className="text-xs text-gray-500">{file.name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Results */}
            {!isImporting && importResults && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold">Import Complete!</h3>
                  <p className="text-xs text-gray-500">
                    Your data has been processed successfully
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {importResults.successful}
                      </div>
                      <div className="text-xs text-gray-500">Successful</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {importResults.duplicates}
                      </div>
                      <div className="text-xs text-gray-500">Duplicates</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {importResults.failed}
                      </div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </CardContent>
                  </Card>
                </div>

                {importResults.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Import Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                        {importResults.errors
                          .slice(0, 10)
                          .map((error, index) => (
                            <div key={index} className="text-red-600">
                              • {error}
                            </div>
                          ))}
                        {importResults.errors.length > 10 && (
                          <div className="text-gray-500 italic">
                            ... and more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setImportResults(null);
                      setImportProgress(0);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Import Another File
                  </Button>
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="bg-[#45a2ff]"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Data</CardTitle>
                <CardDescription className="text-xs">
                  Export your data as CSV or Excel file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value) =>
                      setExportFormat(value as "csv" | "excel")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-blue-800">Data Summary</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    {exportData.length} records will be exported
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Fields: {exportFields.map((f) => f.label).join(", ")}
                  </p>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={
                    isExporting || !exportData || exportData.length === 0
                  }
                  className="w-full bg-[#45a2ff]"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export as {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
