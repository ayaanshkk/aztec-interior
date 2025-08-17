"use client";

import * as React from "react";
import { Upload, X, Check, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormData {
  [key: string]: string | null;
}

interface DownloadLinks {
  pdf: string;
  excel: string;
}

export default function Page() {
  const [file, setFile] = React.useState<File | null>(null);
  const [extractedData, setExtractedData] = React.useState<FormData | null>(null);
  const [downloads, setDownloads] = React.useState<DownloadLinks | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/bmp"].includes(selectedFile.type) &&
        selectedFile.name
      ) {
        setFile(selectedFile);
      } else {
        toast.error("Only PDF, JPG, PNG, GIF, or BMP files are allowed.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (
        ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/bmp"].includes(droppedFile.type) &&
        droppedFile.name
      ) {
        setFile(droppedFile);
      } else {
        toast.error("Only PDF, JPG, PNG, GIF, or BMP files are allowed.");
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a file.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error response:", errorData);
        throw new Error(`Server responded with status ${response.status}: ${errorData.error ?? "Unknown error"}`);
      }

      const resData = await response.json();
      console.log("Backend response:", resData);

      if (resData.error) {
        throw new Error(resData.error);
      }

      if (!resData.structured_data || !resData.pdf_download_url || !resData.excel_download_url) {
        throw new Error("Invalid response format: missing required fields");
      }

      const baseUrl = "http://127.0.0.1:5000";
      setExtractedData(resData.structured_data);
      setDownloads({
        pdf: baseUrl + resData.pdf_download_url,
        excel: baseUrl + resData.excel_download_url,
      });
      toast.success("File processed successfully!");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error(`Error processing file: ${error.message}`);
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setExtractedData((prev) => ({
      ...prev,
      [field]: value ?? null,
    }));
  };

  const sections = [
    {
      title: "Customer Information",
      fields: [
        "customer_name",
        "address",
        "room",
        "tel_mob_number",
        "survey_date",
        "appt_date",
        "pro_inst_date",
        "comp_chk_date",
        "date_deposit_paid",
      ],
    },
    {
      title: "Style and Color",
      fields: [
        "fitting_style",
        "door_style",
        "door_colour",
        "end_panel_colour",
        "plinth_filler_colour",
        "worktop_colour",
        "cabinet_colour",
        "handles_code_qty_size",
      ],
    },
    {
      title: "Bedside Cabinets",
      fields: [
        "bedside_cabinets_style",
        "bedside_cabinets_qty",
      ],
    },
    {
      title: "Dresser/Desk",
      fields: ["dresser_desk_present", "dresser_desk_qty_size"],
    },
    {
      title: "Internal Mirror",
      fields: ["internal_mirror_present", "internal_mirror_qty_size"],
    },
    {
      title: "Mirror",
      fields: ["mirror_style", "mirror_qty"],
    },
    {
      title: "Soffit Lights",
      fields: [
        "soffit_lights_type",
        "soffit_lights_colour",
        "soffit_lights_qty",
      ],
    },
    {
      title: "Gable Lights",
      fields: [
        "gable_lights_colour",
        "gable_lights_qty",
      ],
    },
    {
      title: "Other/Misc/Accessories",
      fields: ["carpet_protection", "floor_tile_protection", "no_floor"],
    },
    {
      title: "Terms and Signature",
      fields: [
        "date_terms_conditions_given",
        "gas_electric_installation_terms_given",
        "customer_signature",
        "signature_date",
      ],
    },
  ];

  const checkboxFields = [
    "carpet_protection",
    "floor_tile_protection",
    "no_floor",
  ];

  const getBedsideCabinetStyle = (data: FormData) => {
    if (data.bedside_cabinets_floating === "✓") return "Floating";
    if (data.bedside_cabinets_fitted === "✓") return "Fitted";
    if (data.bedside_cabinets_freestand === "✓") return "Freestand";
    return "-";
  };

  const getDresserDeskPresent = (data: FormData) => {
    if (data.dresser_desk_yes === "✓") return "Yes";
    if (data.dresser_desk_no === "✓") return "No";
    return "-";
  };

  const getInternalMirrorPresent = (data: FormData) => {
    if (data.internal_mirror_yes === "✓") return "Yes";
    if (data.internal_mirror_no === "✓") return "No";
    return "-";
  };

  const getMirrorStyle = (data: FormData) => {
    if (data.mirror_silver === "✓") return "Silver";
    if (data.mirror_bronze === "✓") return "Bronze";
    if (data.mirror_grey === "✓") return "Grey";
    return "-";
  };

  const getSoffitLightsType = (data: FormData) => {
    if (data.soffit_lights_spot === "✓") return "Spot";
    if (data.soffit_lights_strip === "✓") return "Strip";
    return "-";
  };

  const getSoffitLightsColour = (data: FormData) => {
    if (data.soffit_lights_cool_white === "✓") return "Cool White";
    if (data.soffit_lights_warm_white === "✓") return "Warm White";
    return data.soffit_lights_colour ?? "-";
  };

  const getGableLightsColour = (data: FormData) => {
    if (data.gable_lights_black === "✓") return "Black";
    if (data.gable_lights_white === "✓") return "White";
    return data.gable_lights_colour ?? data.gable_lights_profile_colour ?? "-";
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-2 md:p-4 w-full">
      <Card className="shadow-lg border border-gray-200 rounded-xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Bedroom Checklist Form Upload
          </CardTitle>
          <CardDescription className="text-gray-600">
            Drag and drop or select a PDF, JPG, PNG, GIF, or BMP file to extract bedroom checklist data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
              } hover:border-blue-400 hover:bg-blue-50`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.png,.gif,.bmp"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  {isDragging ? "Drop your file here" : "Drag & drop a file or click to select"}
                </span>
                <span className="text-xs text-gray-500">
                  Supported formats: PDF, JPG, PNG, GIF, BMP
                </span>
              </Label>
            </div>
            {file && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-gray-700">Selected File:</h3>
                <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                  <span className="text-sm text-gray-800 truncate max-w-[80%]">
                    {file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            <Button
              type="submit"
              className="mt-4 w-fit bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md flex items-center"
              disabled={isLoading ?? !file}
            >
              {isLoading ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Upload className="mr-2 w-4 h-4" />
              )}
              Process File
            </Button>
          </form>
        </CardContent>
      </Card>

      {extractedData && (
        <Card className="shadow-lg border border-gray-200 rounded-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Extracted Data
            </CardTitle>
            <CardDescription className="text-gray-600">
              Data extracted from the uploaded bedroom checklist form. Edit fields as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sections.map((section, index) => (
              <div key={index} className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {section.title}
                </h3>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-gray-800 w-1/2">Field</TableHead>
                      <TableHead className="font-semibold text-gray-800 w-1/2">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.title === "Bedside Cabinets" ? (
                      [
                        <TableRow key="bedside_cabinets_style" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Style</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getBedsideCabinetStyle(extractedData)}
                              onChange={(e) => handleFieldChange("bedside_cabinets_style", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="bedside_cabinets_qty" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.bedside_cabinets_qty ?? ""}
                              onChange={(e) => handleFieldChange("bedside_cabinets_qty", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : section.title === "Dresser/Desk" ? (
                      [
                        <TableRow key="dresser_desk_present" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Present</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getDresserDeskPresent(extractedData)}
                              onChange={(e) => handleFieldChange("dresser_desk_present", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="dresser_desk_qty_size" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity/Size</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.dresser_desk_qty_size ?? ""}
                              onChange={(e) => handleFieldChange("dresser_desk_qty_size", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : section.title === "Internal Mirror" ? (
                      [
                        <TableRow key="internal_mirror_present" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Present</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getInternalMirrorPresent(extractedData)}
                              onChange={(e) => handleFieldChange("internal_mirror_present", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="internal_mirror_qty_size" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity/Size</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.internal_mirror_qty_size ?? ""}
                              onChange={(e) => handleFieldChange("internal_mirror_qty_size", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : section.title === "Mirror" ? (
                      [
                        <TableRow key="mirror_style" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Style</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getMirrorStyle(extractedData)}
                              onChange={(e) => handleFieldChange("mirror_style", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="mirror_qty" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.mirror_qty ?? ""}
                              onChange={(e) => handleFieldChange("mirror_qty", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : section.title === "Soffit Lights" ? (
                      [
                        <TableRow key="soffit_lights_type" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Type</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getSoffitLightsType(extractedData)}
                              onChange={(e) => handleFieldChange("soffit_lights_type", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="soffit_lights_colour" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Colour</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getSoffitLightsColour(extractedData)}
                              onChange={(e) => handleFieldChange("soffit_lights_colour", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="soffit_lights_qty" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.soffit_lights_qty ?? ""}
                              onChange={(e) => handleFieldChange("soffit_lights_qty", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : section.title === "Gable Lights" ? (
                      [
                        <TableRow key="gable_lights_colour" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Colour</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={getGableLightsColour(extractedData)}
                              onChange={(e) => handleFieldChange("gable_lights_colour", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                        <TableRow key="gable_lights_qty" className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">Quantity</TableCell>
                          <TableCell className="py-2">
                            <Input
                              value={extractedData.gable_lights_qty ?? ""}
                              onChange={(e) => handleFieldChange("gable_lights_qty", e.target.value)}
                              className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                            />
                          </TableCell>
                        </TableRow>,
                      ]
                    ) : (
                      section.fields.map((field) => (
                        <TableRow key={field} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-700 py-2">
                            {field
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </TableCell>
                          <TableCell className="py-2">
                            {checkboxFields.includes(field) ? (
                              <Input
                                type="checkbox"
                                checked={extractedData[field] === "✓"}
                                className="w-4 h-4"
                              />
                            ) : (
                              <Input
                                value={extractedData[field] ?? ""}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                className="w-full border-none bg-transparent shadow-none focus:ring-0 focus:outline-none"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}

            {downloads && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Downloads</h3>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-gray-800 w-1/3">File</TableHead>
                      <TableHead className="font-semibold text-gray-800 w-1/3">PDF</TableHead>
                      <TableHead className="font-semibold text-gray-800 w-1/3">Excel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="text-gray-700 py-2">Processed File</TableCell>
                      <TableCell className="py-2">
                        <Button
                          asChild
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md flex items-center gap-2 w-full justify-center"
                        >
                          <a href={downloads.pdf} download>
                            <Download className="w-4 h-4" />
                            Download PDF
                          </a>
                        </Button>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          asChild
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-md flex items-center gap-2 w-full justify-center"
                        >
                          <a href={downloads.excel} download>
                            <Download className="w-4 h-4" />
                            Download Excel
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}