"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Users,
  Loader2,
  FileSpreadsheet,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (results: ImportResult) => void;
}

interface ImportResult {
  successful: number;
  failed: number;
  duplicates: number;
  errors: string[];
}

interface ParsedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  jobTitle?: string;
  source?: string;
  notes?: string;
  [key: string]: any;
}

interface FieldMapping {
  csvField: string;
  leadField: string;
  required: boolean;
  selected: boolean;
}

const LEAD_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "businessName", label: "Company/Business", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
  { key: "source", label: "Lead Source", required: false },
  { key: "notes", label: "Notes", required: false },
];

const SAMPLE_CSV_DATA = `First Name,Last Name,Email,Phone,Company,Job Title,Source
John,Doe,john.doe@company.com,+1-555-0123,Acme Corp,CEO,Website
Jane,Smith,jane.smith@techcorp.com,+1-555-0124,TechCorp,CTO,Referral
Mike,Johnson,mike.j@startup.io,+1-555-0125,StartupIO,Founder,LinkedIn`;

export function BulkImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<
    "upload" | "mapping" | "preview" | "importing" | "complete"
  >("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [processingLeads, setProcessingLeads] = useState<ParsedLead[]>([]);
  const { currentOrganization, token, user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (csvFile) {
      setFile(csvFile);

      Papa.parse(csvFile, {
        header: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.error("Error parsing CSV file");
            return;
          }

          setCsvData(results.data);
          setCsvHeaders(results.meta.fields || []);

         
          const normalize = (s: string) =>
            (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

          const headers = (results.meta.fields || []).map((h) => ({
            raw: h,
            norm: normalize(h),
          }));

          const mappings: FieldMapping[] = LEAD_FIELDS.map((field) => {
            const normKey = normalize(field.key);
            const normLabel = normalize(field.label);

            const match = headers.find(
              (h) =>
                h.norm.includes(normKey) ||
                h.norm.includes(normLabel) ||
                normKey.includes(h.norm) ||
                normLabel.includes(h.norm)
            );

            const csvField = match?.raw || "";

            return {
              csvField,
              leadField: field.key,
              required: field.required,
              selected: !!csvField,
            };
          });

          setFieldMappings(mappings);
          setStep("mapping");
        },
        error: (error) => {
          toast.error(`Error reading file: ${error.message}`);
        },
      });
    }
  }, []);

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
  });

  const handleMappingChange = (index: number, csvField: string) => {
    const newMappings = [...fieldMappings];
    newMappings[index].csvField = csvField;
    newMappings[index].selected = !!csvField;
    setFieldMappings(newMappings);
  };

  const validateMappings = () => {
    const errors: string[] = [];
    const requiredFields = fieldMappings.filter((m) => m.required);

    requiredFields.forEach((field) => {
      if (!field.selected || !field.csvField) {
        errors.push(
          `${
            LEAD_FIELDS.find((f) => f.key === field.leadField)?.label
          } is required`
        );
      }
    });

   
    const usedFields = fieldMappings.filter((m) => m.selected && m.csvField);
    const duplicates = usedFields.filter(
      (field, index) =>
        usedFields.findIndex((f) => f.csvField === field.csvField) !== index
    );

    if (duplicates.length > 0) {
      errors.push("Each CSV field can only be mapped once");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const processPreview = () => {
    if (!validateMappings()) return;

    const mappedData: ParsedLead[] = csvData.slice(0, 5).map((row) => {
      const lead: ParsedLead = {
        firstName: "",
        lastName: "",
        email: "",
      };

      fieldMappings.forEach((mapping) => {
        if (mapping.selected && mapping.csvField) {
          lead[mapping.leadField] = row[mapping.csvField] || "";
        }
      });

      return lead;
    });

    setProcessingLeads(mappedData);
    setStep("preview");
  };

  const startImport = async () => {
    if (!currentOrganization?.organizationId || !user?.userId) {
      toast.error("Missing organization or user context");
      return;
    }

    setStep("importing");
    setImportProgress(0);

   
    const rows: ParsedLead[] = csvData.map((row) => {
      const lead: ParsedLead = {
        firstName: "",
        lastName: "",
        email: "",
      };
      fieldMappings.forEach((mapping) => {
        if (mapping.selected && mapping.csvField) {
          lead[mapping.leadField] = row[mapping.csvField] || "";
        }
      });
      return lead;
    });

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          organizationId: currentOrganization.organizationId,
          workspaceId: currentWorkspace?.id || undefined,
          rows,
        }),
      });
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
      setStep("complete");
      onImportComplete?.(result);
      toast.success(`Import completed! ${result.successful} leads imported.`);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    }
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV_DATA], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-leads.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setStep("upload");
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMappings([]);
    setImportProgress(0);
    setImportResults(null);
    setValidationErrors([]);
    setProcessingLeads([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Leads
          </DialogTitle>
          <DialogDescription>
            Import leads from CSV or Excel files. Map your data fields and
            review before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {}
          <div className="flex items-center justify-between text-sm">
            {["upload", "mapping", "preview", "importing", "complete"].map(
              (stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                      step === stepName
                        ? "bg-blue-600 text-white"
                        : [
                            "upload",
                            "mapping",
                            "preview",
                            "importing",
                            "complete",
                          ].indexOf(step) > index
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    )}
                  >
                    {[
                      "upload",
                      "mapping",
                      "preview",
                      "importing",
                      "complete",
                    ].indexOf(step) > index ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 4 && (
                    <div
                      className={cn(
                        "w-12 h-0.5 mx-2",
                        [
                          "upload",
                          "mapping",
                          "preview",
                          "importing",
                          "complete",
                        ].indexOf(step) > index
                          ? "bg-green-600"
                          : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              )
            )}
          </div>

          {}
          {step === "upload" && (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                )}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-blue-600">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop your CSV file here
                    </p>
                    <p className="text-gray-500 mb-4">
                      or click to browse files
                    </p>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Supported formats:</h4>
                  <p className="text-sm text-gray-500">
                    CSV, Excel (.xls, .xlsx)
                  </p>
                </div>
                <Button variant="outline" onClick={downloadSampleCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>

              {file && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB •{" "}
                            {csvData.length} rows
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setFile(null)}
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

          {step === "mapping" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Map CSV Fields</h3>
                  <p className="text-sm text-gray-500">
                    Map your CSV columns to lead fields. Required fields must be
                    mapped.
                  </p>
                </div>
                <Badge variant="outline">{csvData.length} rows detected</Badge>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <h4 className="font-medium text-red-800">
                      Validation Errors
                    </h4>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {fieldMappings.map((mapping, index) => (
                  <div
                    key={mapping.leadField}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <Checkbox
                      checked={mapping.selected}
                      onCheckedChange={(checked) => {
                        const newMappings = [...fieldMappings];
                        newMappings[index].selected = !!checked;
                        if (!checked) {
                          newMappings[index].csvField = "";
                        }
                        setFieldMappings(newMappings);
                      }}
                      disabled={mapping.required}
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                      <div>
                        <Label className="font-medium">
                          {
                            LEAD_FIELDS.find((f) => f.key === mapping.leadField)
                              ?.label
                          }
                          {mapping.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                      </div>
                      <Select
                        value={mapping.csvField}
                        onValueChange={(value) =>
                          handleMappingChange(index, value)
                        }
                        disabled={!mapping.selected}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select CSV column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__no_mapping__">
                            -- No mapping --
                          </SelectItem>
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back to Upload
                </Button>
                <Button onClick={processPreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Data
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Preview Import Data</h3>
                  <p className="text-sm text-gray-500">
                    Review the first 5 rows of mapped data before importing.
                  </p>
                </div>
                <Badge variant="outline">
                  {csvData.length} total rows to import
                </Badge>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {fieldMappings
                            .filter((m) => m.selected)
                            .map((mapping) => (
                              <th
                                key={mapping.leadField}
                                className="px-4 py-3 text-left text-sm font-medium"
                              >
                                {
                                  LEAD_FIELDS.find(
                                    (f) => f.key === mapping.leadField
                                  )?.label
                                }
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {processingLeads.map((lead, index) => (
                          <tr key={index}>
                            {fieldMappings
                              .filter((m) => m.selected)
                              .map((mapping) => (
                                <td
                                  key={mapping.leadField}
                                  className="px-4 py-3 text-sm"
                                >
                                  {lead[mapping.leadField] || "-"}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back to Mapping
                </Button>
                <Button
                  onClick={startImport}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import ({csvData.length} leads)
                </Button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-6 text-center">
              <div>
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
                <h3 className="text-lg font-semibold">Importing Leads...</h3>
                <p className="text-sm text-gray-500">
                  Please wait while we process your data
                </p>
              </div>

              <div className="space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm font-medium">
                  {Math.round(importProgress)}% complete
                </p>
              </div>
            </div>
          )}

          {step === "complete" && importResults && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold">Import Complete!</h3>
                <p className="text-sm text-gray-500">
                  Your leads have been processed successfully
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResults.successful}
                    </div>
                    <div className="text-sm text-gray-500">Successful</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {importResults.duplicates}
                    </div>
                    <div className="text-sm text-gray-500">Duplicates</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResults.failed}
                    </div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {importResults.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Import Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="text-red-600">
                          • {error}
                        </div>
                      ))}
                      {importResults.errors.length >= 10 && (
                        <div className="text-gray-500 italic">... and more</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetDialog}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Import Another File
                </Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
