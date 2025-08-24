"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PenTool, Upload } from "lucide-react";
import { useSearchParams } from "next/dist/client/components/navigation";

export default function FormPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type"); // "bedroom" or "kitchen"

  const [formType, setFormType] = useState<"bedroom" | "kitchen">("bedroom");
  const [valid, setValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Form data state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    room: '',
    survey_date: '',
    appointment_date: '',
    installation_date: '',
    completion_date: '',
    deposit_date: '',
    // Add other form fields as needed
  });

  useEffect(() => {
    if (typeParam === "kitchen" || typeParam === "bedroom") {
      setFormType(typeParam);
    } else {
      setValid(false); // invalid type param
    }
  }, [typeParam]);

  const [signatureMode, setSignatureMode] = useState("upload"); // "upload" or "draw"
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState("");

  // Signature canvas functionality
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  type Point = { x: number; y: number } | null;
  const [lastPoint, setLastPoint] = useState<Point>(null);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPoint({ x, y });
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  
    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  
    setLastPoint({ x, y });
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };
  
  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureData("");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.customer_name.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Customer name is required'
      });
      return;
    }

    if (!formData.customer_address.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Customer address is required'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Get the token from URL parameters (if using token-based system)
      const token = searchParams.get("token");
      
      const response = await fetch('http://localhost:5000/submit-customer-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          formData: {
            ...formData,
            form_type: formType,
            signature_data: signatureData,
            // Add any additional form fields you want to store
          }
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Form submitted successfully! Customer created.'
        });
        
        // Optional: Reset form or redirect
        // setFormData({ ... reset to initial state });
        
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Failed to submit form'
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!valid) return <p className="p-6 text-center">Invalid or expired link.</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Checklist</h1>
              <p className="text-gray-600 mt-1">Complete installation verification form</p>
            </div>
            <div className="flex gap-2">
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {formType === "kitchen" ? "Kitchen Installation Checklist" : "Bedroom Installation Checklist"}
          </h2>

          {/* Status Message */}
          {submitStatus.type && (
            <div className={`mb-6 p-4 rounded-lg ${
              submitStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {submitStatus.message}
            </div>
          )}

          {/* Customer Information Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <Input 
                  placeholder="Enter customer name" 
                  className="w-full" 
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tel/Mobile Number *</label>
                <Input 
                  placeholder="Enter phone number" 
                  type="tel" 
                  className="w-full" 
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <Input 
                  placeholder="Enter full address" 
                  className="w-full" 
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                  required
                />
              </div>
              {formType === "bedroom" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <Input 
                    placeholder="Enter room details" 
                    className="w-full" 
                    value={formData.room}
                    onChange={(e) => handleInputChange('room', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dates Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Survey Date</label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={formData.survey_date}
                  onChange={(e) => handleInputChange('survey_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={formData.appointment_date}
                  onChange={(e) => handleInputChange('appointment_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Installation Date</label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={formData.installation_date}
                  onChange={(e) => handleInputChange('installation_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Check Date</label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={formData.completion_date}
                  onChange={(e) => handleInputChange('completion_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Deposit Paid</label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={formData.deposit_date}
                  onChange={(e) => handleInputChange('deposit_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Design Specifications */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Design Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formType === "bedroom" ? "Fitting Style" : "Handles/Handle Style (Kato Col)"}
                </label>
                <Input placeholder="Enter style details" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Door Style/Color</label>
                <Input placeholder="Enter door style and color" className="w-full" />
              </div>
              {formType === "kitchen" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drawer Color</label>
                  <Input placeholder="Enter drawer color" className="w-full" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Panel Color</label>
                <Input placeholder="Enter end panel color" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plinth/Filler Color</label>
                <Input placeholder="Enter plinth/filler color" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cabinet Color</label>
                <Input placeholder="Enter cabinet color" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formType === "bedroom" ? "Worktop Color" : "Worktop Material/Color"}
                </label>
                <Input placeholder="Enter worktop details" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handles Code/QTY/Size</label>
                <Input placeholder="Enter handle specifications" className="w-full" />
              </div>
            </div>
          </div>

          {/* Bedroom Specific Fields */}
          {formType === "bedroom" && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Bedroom Specifications</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedside Cabinets</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Select option</option>
                      <option value="floating">Floating</option>
                      <option value="fitted">Fitted</option>
                      <option value="freestand">Freestand</option>
                    </select>
                    <Input placeholder="Quantity" className="w-full mt-2" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dresser/Desk</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Input placeholder="QTY/Size" className="w-full mt-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Mirror</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Input placeholder="QTY/Size" className="w-full mt-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mirror</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Select option</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                      <option value="grey">Grey</option>
                    </select>
                    <Input placeholder="Quantity" className="w-full mt-2" type="number" />
                  </div>
                </div>

                {/* Lighting Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soffit Lights</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Select type</option>
                      <option value="spot">Spot</option>
                      <option value="strip">Strip</option>
                    </select>
                    <Input placeholder="Colour" className="w-full mt-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gable Lights</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select className="flex-1 p-2 border border-gray-300 rounded-md">
                          <option value="">Light Colour</option>
                          <option value="cool-white">Cool White</option>
                          <option value="warm-white">Warm White</option>
                        </select>
                        <Input placeholder="QTY" type="number" className="w-20" />
                      </div>
                      <div className="flex gap-2">
                        <select className="flex-1 p-2 border border-gray-300 rounded-md">
                          <option value="">Profile Colour</option>
                          <option value="black">Black</option>
                          <option value="white">White</option>
                        </select>
                        <Input placeholder="QTY" type="number" className="w-20" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other/Misc/Accessories</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                    placeholder="Enter additional items or notes"
                  ></textarea>
                </div>

                {/* Floor Protection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor Protection</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Carpet Protection</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Floor Tile Protection</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>No Floor Protection Required</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kitchen Specific Fields */}
          {formType === "kitchen" && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Kitchen Specifications</h3>
              <div className="space-y-6">
                
                {/* Worktop Further Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Worktop Further Info</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Upstand', 'Splashback', 'Wall Cladding', 'Sink Cut Out', 'Drainer Grooves', 'Hob Cut Out', 'Window Cill', 'LED Grooves'].map((item) => (
                      <label key={item} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                  <Input placeholder="Other details" className="w-full mt-2" />
                </div>

                {/* Worktop Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Worktop Size</label>
                  <select className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="">Select thickness</option>
                    <option value="12mm">12mm</option>
                    <option value="20mm">20mm</option>
                    <option value="30mm">30mm</option>
                  </select>
                </div>

                {/* Lighting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Under Wall Unit Lights</label>
                    <div className="space-y-2">
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Main Colour</option>
                        <option value="cool-white">Cool White</option>
                        <option value="warm-white">Warm White</option>
                      </select>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Profile Colour</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Under Worktop Lights</label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option value="">Colour</option>
                      <option value="cool-white">Cool White</option>
                      <option value="warm-white">Warm White</option>
                    </select>
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessories</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                    placeholder="Enter accessory details"
                  ></textarea>
                </div>

                {/* Sink & Tap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sink</label>
                    <Input placeholder="Sink details" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tap</label>
                    <Input placeholder="Tap details" className="w-full" />
                  </div>
                </div>

                {/* Appliances */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appliances</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Oven', 'Microwave', 'Washing Machine', 'HOB', 'Extractor', 'INTG Dishwasher', 'INTEG Fridge/Freezer'].map((appliance) => (
                      <label key={appliance} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{appliance}</span>
                      </label>
                    ))}
                  </div>
                  <Input placeholder="Other/MISC" className="w-full mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Terms & Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Terms and Conditions Given</label>
                <Input type="date" className="w-full max-w-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gas and Electric Installation {formType === "kitchen" ? "Information" : "Terms"} Given</label>
                <select className="w-full max-w-xs p-2 border border-gray-300 rounded-md">
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {formType === "kitchen" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Promotion Information Given</label>
                  <select className="w-full max-w-xs p-2 border border-gray-300 rounded-md">
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Statement */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              I confirm that the above specification and all annotated plans and elevations with this pack are correct.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Please sign below to confirm.
            </p>
          </div>

          {/* Signature Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Customer Signature</h3>
            
            <div className="mb-4">
              <div className="flex gap-4 mb-3">
                <Button
                  variant={signatureMode === "upload" ? "default" : "outline"}
                  onClick={() => setSignatureMode("upload")}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Signature
                </Button>
                <Button
                  variant={signatureMode === "draw" ? "default" : "outline"}
                  onClick={() => setSignatureMode("draw")}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PenTool className="h-4 w-4" />
                  Draw Signature
                </Button>
              </div>

              {signatureMode === "upload" ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="signature-upload"
                  />
                  <label htmlFor="signature-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload signature image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full cursor-crosshair bg-white rounded-lg"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                  <div className="p-2 border-t bg-gray-50 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input type="date" className="w-full max-w-xs" />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center pt-6 border-t">
            <Button 
              className="px-8 py-2 text-lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}