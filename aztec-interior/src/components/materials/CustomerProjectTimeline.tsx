"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Package, AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Material {
  id: string;
  description: string;
  status: 'not_ordered' | 'ordered' | 'in_transit' | 'delivered' | 'delayed';
  delivery_status: string;
}

interface Timeline {
  materials_ordered: boolean;
  all_materials_delivered: boolean;
  can_modify_project: boolean;
  latest_expected_delivery: string | null;
  estimated_completion_date: string | null;
  message: string;
}

interface ProjectTimeline {
  customer_id: string;
  customer_name: string;
  timeline: Timeline;
  materials_breakdown?: Material[]; // ✅ Make optional
}

export function CustomerProjectTimeline({ customerId }: { customerId: string }) {
  const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline();
  }, [customerId]);

  const fetchTimeline = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      console.log(`🔍 Fetching timeline for customer ${customerId}...`);
      
      const response = await fetch(
        `https://aztec-interiors.onrender.com/materials/timeline/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Timeline fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch timeline: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Timeline data received:', data);
      
      setTimeline(data);
      setError(null);
    } catch (err) {
      console.error('❌ Timeline error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; text: string }> = {
      not_ordered: { color: 'bg-gray-200 text-gray-700', text: 'Not Ordered' },
      ordered: { color: 'bg-blue-100 text-blue-700', text: 'Ordered' },
      in_transit: { color: 'bg-yellow-100 text-yellow-700', text: 'In Transit' },
      delivered: { color: 'bg-green-100 text-green-700', text: 'Delivered' },
      delayed: { color: 'bg-red-100 text-red-700', text: 'Delayed' },
    };

    const variant = variants[status] || variants.not_ordered;
    return (
      <Badge className={variant.color}>
        {variant.text}
      </Badge>
    );
  };

  const getTimelineIcon = (timeline: Timeline) => {
    if (timeline.can_modify_project) {
      return <Edit className="h-6 w-6 text-blue-500" />;
    } else if (timeline.all_materials_delivered) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (timeline.materials_ordered) {
      return <Package className="h-6 w-6 text-yellow-500" />;
    }
    return <Clock className="h-6 w-6 text-gray-500" />;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="ml-3 text-gray-600">Loading timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <button 
            onClick={fetchTimeline} 
            className="ml-3 underline text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!timeline) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No timeline data available for this customer.</AlertDescription>
      </Alert>
    );
  }

  // ✅ CRITICAL FIX: Safely access materials_breakdown
  const { timeline: timelineData, materials_breakdown = [] } = timeline;

  return (
    <div className="space-y-4">
      {/* Quick Status Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTimelineIcon(timelineData)}
              <div>
                <CardTitle>Project Timeline - {timeline.customer_name}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {timelineData.message}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Materials Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Materials</span>
              </div>
              <p className="text-lg font-semibold">
                {timelineData.materials_ordered ? (
                  <span className="text-blue-600">✓ Ordered</span>
                ) : (
                  <span className="text-gray-600">Not Ordered</span>
                )}
              </p>
            </div>

            {/* Expected Delivery */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Expected Delivery</span>
              </div>
              <p className="text-lg font-semibold">
                {formatDate(timelineData.latest_expected_delivery)}
              </p>
            </div>

            {/* Estimated Completion */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Est. Completion</span>
              </div>
              <p className="text-lg font-semibold">
                {formatDate(timelineData.estimated_completion_date)}
              </p>
            </div>
          </div>

          {/* Modification Status Alert */}
          {timelineData.can_modify_project ? (
            <Alert className="bg-green-50 border-green-200">
              <Edit className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✓ Project modifications are SAFE - No materials ordered yet
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                ⚠️ Materials already ordered - Modifications may incur costs or delays
              </AlertDescription>
            </Alert>
          )}

          {/* Materials Breakdown - ✅ SAFE ACCESS */}
          {materials_breakdown && materials_breakdown.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 text-gray-700">Materials Breakdown</h4>
              <div className="space-y-2">
                {materials_breakdown.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {material.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {material.delivery_status}
                      </p>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(material.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Response Guide */}
      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-blue-900">
            Quick Response Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          {timelineData.can_modify_project ? (
            <>
              <p>✓ Customer wants modifications? <strong>YES - Safe to proceed</strong></p>
              <p>✓ Can we meet end-of-month deadline? <strong>Check with production team</strong></p>
            </>
          ) : timelineData.estimated_completion_date ? (
            <>
              <p>✓ Customer wants modifications? <strong>Possible but may delay/cost extra</strong></p>
              <p>✓ Can we meet their deadline? <strong>Estimated completion: {formatDate(timelineData.estimated_completion_date)}</strong></p>
            </>
          ) : (
            <>
              <p>⚠️ Customer wants modifications? <strong>Materials ordered - Contact supplier</strong></p>
              <p>⚠️ Can we meet their deadline? <strong>Need delivery date confirmation from production</strong></p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}