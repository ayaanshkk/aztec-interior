"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, PenTool, Upload } from "lucide-react";
import { useParams } from "next/navigation";

export default function FormPage() {
  const params = useParams();
  const token = params?.token as string; // Extract token from URL path
  
  // Get URL search parameters
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [typeParam, setTypeParam] = useState<string | null>(null);
  const [customerIdParam, setCustomerIdParam] = useState<string | null>(null);

  // Initialize search params on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setSearchParams(urlParams);
      setTypeParam(urlParams.get("type"));
      setCustomerIdParam(urlParams.get("customerId"));
    }
  }, []);

  const [formType, setFormType] = useState<"bedroom" | "kitchen">("bedroom");
  const [valid, setValid] = useState(true);
  const [tokenValidated, setTokenValidated] = useState(false);
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

  // Validate token and set form type when component loads
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValid(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/validate-form-token/${token}`);
        const result = await response.json();
        
        if (response.ok && result.valid) {
          setTokenValidated(true);
          // Set form type from token data or URL param
          const formTypeFromToken = result.form_type;
          const formTypeFromUrl = typeParam;
          
          if (formTypeFromToken === "kitchen" || formTypeFromToken === "bedroom") {
            setFormType(formTypeFromToken);
          } else if (formTypeFromUrl === "kitchen" || formTypeFromUrl === "bedroom") {
            setFormType(formTypeFromUrl);
          }
          
        } else {
          setValid(false);
          setSubmitStatus({
            type: 'error',
            message: result.error || 'Invalid or expired form link'
          });
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setValid(false);
        setSubmitStatus({
          type: 'error',
          message: 'Unable to validate form link'
        });
      }
    };

    if (token) {
      validateToken();
    } else if (typeParam === "kitchen" || typeParam === "bedroom") {
      // Fallback: allow form without token if type is valid
      setFormType(typeParam);
      setTokenValidated(true);
    } else {
      setValid(false);
    }
  }, [token, typeParam]);

  const [signatureMode, setSignatureMode] = useState("upload");
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
      console.log('Submitting form with token:', token);
      console.log('Customer ID param:', customerIdParam);
      
      const response = await fetch('http://localhost:5000/submit-customer-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token, // Include token from URL
          formData: {
            ...formData,
            form_type: formType,
            signature_data: signatureData,
            customer_id: customerIdParam, // Include customer_id as fallback
          }
        }),
      });

      const result = await response.json();
      console.log('Form submission result:', result);

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message || 'Form submitted successfully!'
        });
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            customer_name: '',
            customer_phone: '',
            customer_address: '',
            room: '',
            survey_date: '',
            appointment_date: '',
            installation_date: '',
            completion_date: '',
            deposit_date: '',
          });
          setSignatureData('');
          clearSignature();
        }, 2000);
        
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

  if (!valid) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Invalid or expired form link.</p>
        {submitStatus.message && (
          <p className="text-sm text-gray-600">{submitStatus.message}</p>
        )}
      </div>
    );
  }

  if (!tokenValidated) {
    return <div className="p-6 text-center">Validating form link...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Installation Checklist</h1>
              <p className="text-gray-600 mt-1">Complete installation verification form</p>
              {customerIdParam && (
                <p className="text-sm text-blue-600 mt-1">This form will be linked to your customer record</p>
              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tel/Mobile Number</label>
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
            {customerIdParam && (
              <p className="text-sm text-gray-500 mt-2">
                This form will be linked to your customer record
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}