"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchWithAuth } from '@/lib/api';

interface MaterialOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  material_description: string;
  supplier_name: string | null;
  supplier_reference: string | null;
  status: 'not_ordered' | 'ordered' | 'delivered' | 'delivered_to_customer' | 'in_stock';
  order_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  estimated_cost: number | null;
  ordered_by: string | null;
  notes: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  stage: string;
  customer_stage?: string;
  project_count?: number;
  projects_at_stage?: number;
  project_details?: Array<{
    id: string;
    name: string;
    type: string;
    stage: string;
  }>;
  total_projects?: number;
  has_separate_projects?: boolean;
  is_customer_level?: boolean;
}

interface NewMaterialForm {
  customer_id: string;
  material_description: string;
  supplier_name: string;
  estimated_cost: string;
  order_date: string; 
  expected_delivery_date: string;
  notes: string;
}

export function ProductionMaterialsManagement() {
  const [materials, setMaterials] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOrder | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // ✅ NEW: Track edit mode
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialOrder | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    material_description: string;
    supplier_name: string;
    estimated_cost: string;
    order_date: string;
    expected_delivery_date: string;
    notes: string;
    status: string;
  } | null>(null);

  // Form states
  const [newMaterialForm, setNewMaterialForm] = useState<NewMaterialForm>({
    customer_id: '',
    material_description: '',
    supplier_name: '',
    estimated_cost: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: ''
  });

  useEffect(() => {
    console.log('🚀 Component mounted - loading materials...');
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      console.log('📦 Fetching materials...');
      const timestamp = new Date().getTime();
      const response = await fetchWithAuth(`materials?_t=${timestamp}`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      console.log('✅ Materials loaded:', data.length);
      setMaterials(data);
    } catch (error) {
      console.error('❌ Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      console.log('🔄 Fetching all customers, then filtering for Accepted stage...');
      
      const timestamp = new Date().getTime();
      const response = await fetchWithAuth(`customers?_t=${timestamp}`);
      
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();

      console.log('📊 Total customers fetched:', data.length);
      
      const acceptedCustomers = data.filter((c: any) => 
        c.stage && c.stage.toLowerCase() === 'accepted'
      );
      
      console.log('✅ Customers in Accepted stage:', acceptedCustomers.length);
      
      const mappedCustomers = acceptedCustomers.map((c: any) => ({ 
        id: c.id, 
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        stage: c.stage,
        project_count: c.project_count || 0,
        total_projects: c.project_count || 0
      }));
      
      setCustomers(mappedCustomers);
      
      if (mappedCustomers.length > 0) {
        console.log('✅ Available customers:', 
          mappedCustomers.map((c: Customer) => `${c.name} (${c.project_count} project(s))`)
        );
      } else {
        console.log('⚠️ No customers found in Accepted stage');
      }
      
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    try {
      if (!newMaterialForm.customer_id) {
        alert('Please select a customer');
        return;
      }
      
      if (!newMaterialForm.material_description.trim()) {
        alert('Please enter a material description');
        return;
      }

      const payload = {
        customer_id: newMaterialForm.customer_id,
        material_description: newMaterialForm.material_description.trim(),
        supplier_name: newMaterialForm.supplier_name.trim() || null,
        estimated_cost: newMaterialForm.estimated_cost ? parseFloat(newMaterialForm.estimated_cost) : null,
        order_date: newMaterialForm.order_date || new Date().toISOString().split('T')[0], 
        expected_delivery_date: newMaterialForm.expected_delivery_date || null,
        notes: newMaterialForm.notes.trim() || null,
        status: 'ordered',
      };

      console.log('📤 Creating material order:', payload);

      const response = await fetchWithAuth('materials', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create material order');
      }

      console.log('✅ Material order created successfully');

      setNewMaterialForm({
        customer_id: '',
        material_description: '',
        supplier_name: '',
        estimated_cost: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: ''
      });
      setIsCreateDialogOpen(false);
      
      await fetchMaterials();
      alert('Material order created successfully!');
      
    } catch (error) {
      console.error('❌ Error creating material order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create material order. Please try again.');
    }
  };

  // ✅ NEW: Quick status update without opening dialog
  const handleUpdateMaterialStatus = async (
    materialId: string,
    newStatus: string,
    deliveryDate?: string
  ) => {
    try {
      const payload: any = { status: newStatus };
      
      if (newStatus === 'delivered' && deliveryDate) {
        payload.actual_delivery_date = deliveryDate;
      }

      console.log('📤 Updating material status:', { materialId, payload });

      const response = await fetchWithAuth(`materials/${materialId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update material status');
      }

      console.log('✅ Material status updated successfully');

      // ✅ Immediately reload materials
      await fetchMaterials();
      
      // Show success message
      const statusText = newStatus.replace('_', ' ').toUpperCase();
      alert(`Status updated to ${statusText}`);
      
    } catch (error) {
      console.error('❌ Error updating material status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update material status. Please try again.');
    }
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !editForm) return;

    try {
      const payload = {
        material_description: editForm.material_description.trim(),
        supplier_name: editForm.supplier_name.trim() || null,
        estimated_cost: editForm.estimated_cost ? parseFloat(editForm.estimated_cost) : null,
        order_date: editForm.order_date,
        expected_delivery_date: editForm.expected_delivery_date || null,
        notes: editForm.notes.trim() || null,
        status: editForm.status,
      };

      console.log('📤 Updating material:', { id: selectedMaterial.id, payload });

      const response = await fetchWithAuth(`materials/${selectedMaterial.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update material');
      }

      console.log('✅ Material updated successfully');

      await fetchMaterials();
      setIsEditing(false); // ✅ Exit edit mode after save
      
      alert('Material updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating material:', error);
      alert(error instanceof Error ? error.message : 'Failed to update material. Please try again.');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;

    try {
      console.log('🗑️ Deleting material order:', materialToDelete.id);

      const response = await fetchWithAuth(`materials/${materialToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete material order');
      }

      console.log('✅ Material order deleted successfully');

      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
      setIsDetailsDialogOpen(false);
      setSelectedMaterial(null);
      setEditForm(null);
      setIsEditing(false);
      
      await fetchMaterials();
      
      alert('Material order deleted successfully!');
      
    } catch (error) {
      console.error('❌ Error deleting material order:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete material order. Please try again.');
    }
  };

  // ✅ UPDATED: Open details dialog in VIEW mode
  const handleMaterialClick = (material: MaterialOrder) => {
    setSelectedMaterial(material);
    setEditForm({
      material_description: material.material_description,
      supplier_name: material.supplier_name || '',
      estimated_cost: material.estimated_cost?.toString() || '',
      order_date: material.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: material.expected_delivery_date || '',
      notes: material.notes || '',
      status: material.status,
    });
    setIsEditing(false); // ✅ Start in VIEW mode
    setIsDetailsDialogOpen(true);
  };

  // ✅ FIXED: Parse material specifications - handle newline-separated format
  const parseMaterialSpecs = useCallback((description: string) => {
    if (!description) {
      return [{ label: '', value: 'No description' }];
    }
    
    // The description comes with each spec on a new line like:
    // "Door Style: slab\nDoor Color: a\nPanel Color: a\n..."
    
    // Split by newlines first
    const lines = description.split('\n').filter(line => line.trim());
    
    const parts: Array<{label: string, value: string}> = [];
    
    for (const line of lines) {
      // Check if line contains a colon (label: value format)
      const colonIndex = line.indexOf(':');
      
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Skip section headers like "--- Additional Door 1 ---"
        if (label.startsWith('---') || !value) {
          continue;
        }
        
        parts.push({
          label: label,
          value: value
        });
      } else {
        // No colon, treat as plain text (like section headers)
        if (line.includes('---')) {
          parts.push({
            label: '',
            value: line
          });
        }
      }
    }
    
    return parts.length > 0 ? parts : [{ label: '', value: description }];
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      ordered: { 
        className: 'bg-blue-100 text-blue-700 border-blue-300', 
        icon: <FileText className="h-3 w-3" />,
        text: 'Ordered' 
      },
      delivered: { 
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300', 
        icon: <Truck className="h-3 w-3" />,
        text: 'Delivered' 
      },
      delivered_to_customer: { 
        className: 'bg-green-100 text-green-700 border-green-300', 
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'Delivered to Customer' 
      },
      in_stock: { 
        className: 'bg-purple-100 text-purple-700 border-purple-300', 
        icon: <Package className="h-3 w-3" />,
        text: 'In Stock' 
      },
    };

    const variant = variants[status] || variants.ordered;
    return (
      <Badge className={`flex items-center gap-1 ${variant.className}`} variant="outline">
        {variant.icon}
        {variant.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString); 
    if (isNaN(date.getTime())) return 'Invalid Date'; 

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // ✅ PERFORMANCE: Memoize filtered materials to avoid re-filtering on every render
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesFilter = filter === 'all' || material.status === filter;
      const matchesSearch = material.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            material.material_description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [materials, filter, searchTerm]);

  // ✅ PERFORMANCE: Memoize stats calculation
  const stats = useMemo(() => ({
    ordered: materials.filter(m => m.status === 'ordered').length,
    delivered: materials.filter(m => m.status === 'delivered').length,
    delivered_to_customer: materials.filter(m => m.status === 'delivered_to_customer').length,
    in_stock: materials.filter(m => m.status === 'in_stock').length,
  }), [materials]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Materials Management</h1>
          <p className="text-gray-500 mt-1">Track and manage material orders</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-2"
              onClick={() => fetchCustomers()}
            >
              <Plus className="h-4 w-4" />
              Order New Materials
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order New Materials</DialogTitle>
              <DialogDescription>
                Create a new material order for a customer in "Accepted" stage
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer * (Accepted Stage Only)</Label>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading customers...</span>
                  </div>
                ) : (
                  <>
                    <Select
                      value={newMaterialForm.customer_id}
                      onValueChange={(value) => {
                        console.log('Selected customer:', value);
                        setNewMaterialForm({ ...newMaterialForm, customer_id: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer in Accepted stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-sm text-gray-500">
                              No customers in "Accepted" stage
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Customers must reach "Accepted" stage before materials can be ordered
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                fetchCustomers();
                              }}
                            >
                              Refresh List
                            </Button>
                          </div>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                {customer.is_customer_level ? (
                                  <span className="text-xs text-blue-600">
                                    ✓ Customer in Accepted stage
                                  </span>
                                ) : customer.projects_at_stage && customer.projects_at_stage > 0 ? (
                                  <span className="text-xs text-green-600">
                                    {customer.projects_at_stage} project{customer.projects_at_stage !== 1 ? 's' : ''} in Accepted
                                    {customer.total_projects && customer.total_projects > customer.projects_at_stage && (
                                      <span className="text-gray-400">
                                        {' '}+ {customer.total_projects - customer.projects_at_stage} in other stages
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    In Accepted stage
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {customers.filter(c => c.is_customer_level).length > 0 && 
                        customers.filter(c => c.has_separate_projects).length > 0
                          ? `${customers.filter(c => c.is_customer_level).length} customer-level, ${customers.filter(c => c.has_separate_projects).length} project-level`
                          : 'Customers in "Accepted" stage'}
                      </p>
                      {customers.length > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          {customers.length} customer{customers.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Material Description *</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Kitchen cabinets - Oak finish, 10 units"
                  value={newMaterialForm.material_description}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, material_description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="e.g., Howdens, B&Q"
                    value={newMaterialForm.supplier_name}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, supplier_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated Cost (£)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newMaterialForm.estimated_cost}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, estimated_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderDate">Date Ordered</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={newMaterialForm.order_date}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, order_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery">Expected Delivery Date</Label>
                <Input
                  id="delivery"
                  type="date"
                  value={newMaterialForm.expected_delivery_date}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, expected_delivery_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or details..."
                  value={newMaterialForm.notes}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewMaterialForm({
                    customer_id: '',
                    material_description: '',
                    supplier_name: '',
                    estimated_cost: '',
                    order_date: new Date().toISOString().split('T')[0],
                    expected_delivery_date: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMaterial}
                disabled={!newMaterialForm.customer_id || !newMaterialForm.material_description.trim() || customersLoading}
              >
                Create Material Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ordered</p>
                <p className="text-2xl font-bold text-blue-600">{stats.ordered}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.delivered}</p>
              </div>
              <Truck className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered to Customer</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered_to_customer}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-purple-600">{stats.in_stock}</p>
              </div>
              <Package className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by customer or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delivered_to_customer">Delivered to Customer</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials List - ✅ CLICKABLE CARDS */}
      <div className="space-y-4">
        {filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Click "Order New Materials" to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMaterials.map((material) => (
            <Card 
              key={material.id} 
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => handleMaterialClick(material)}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {material.customer_name}
                      </h3>
                      {getStatusBadge(material.status)}
                    </div>
                    
                    {/* ✅ FIXED: Display specifications - label and value on SAME line */}
                    <div className="mb-4 space-y-1.5">
                      {parseMaterialSpecs(material.material_description).map((spec, idx) => (
                        spec.label ? (
                          <div key={idx} className="flex items-baseline gap-2">
                            <span className="font-medium text-gray-600 whitespace-nowrap">
                              {spec.label}:
                            </span>
                            <span className="text-gray-900 flex-1">{spec.value}</span>
                          </div>
                        ) : (
                          <p key={idx} className="text-gray-900">{spec.value}</p>
                        )
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Supplier</p>
                        <p className="font-medium">{material.supplier_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Order Date</p>
                        <p className="font-medium">{formatDate(material.order_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expected Delivery</p>
                        <p className="font-medium">{formatDate(material.expected_delivery_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cost</p>
                        <p className="font-medium">{formatCurrency(material.estimated_cost)}</p>
                      </div>
                    </div>

                    {material.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {material.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ✅ NEW: Status Update Buttons in Corner */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <Button
                      size="sm"
                      variant={material.status === 'ordered' ? 'default' : 'outline'}
                      className={`justify-start ${material.status === 'ordered' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateMaterialStatus(material.id, 'ordered');
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Ordered
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={material.status === 'delivered' ? 'default' : 'outline'}
                      className={`justify-start ${material.status === 'delivered' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateMaterialStatus(material.id, 'delivered');
                      }}
                    >
                      <Truck className="h-3 w-3 mr-1" />
                      Delivered
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={material.status === 'delivered_to_customer' ? 'default' : 'outline'}
                      className={`justify-start ${material.status === 'delivered_to_customer' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateMaterialStatus(material.id, 'delivered_to_customer', new Date().toISOString());
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      To Customer
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={material.status === 'in_stock' ? 'default' : 'outline'}
                      className={`justify-start ${material.status === 'in_stock' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-purple-600 border-purple-300 hover:bg-purple-50'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateMaterialStatus(material.id, 'in_stock');
                      }}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      In Stock
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ✅ UPDATED: Material Details Dialog with VIEW and EDIT modes */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => {
        setIsDetailsDialogOpen(open);
        if (!open) {
          setIsEditing(false);
          setSelectedMaterial(null);
          setEditForm(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Material Order' : 'Material Order Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update material order information' : 'View material order information'}
            </DialogDescription>
          </DialogHeader>

          {selectedMaterial && editForm && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="text-lg font-semibold text-gray-900">{selectedMaterial.customer_name}</p>
              </div>

              {/* ✅ VIEW MODE: Display formatted specifications */}
              {!isEditing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Material Description</Label>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-1.5">
                      {parseMaterialSpecs(selectedMaterial.material_description).map((spec, idx) => (
                        spec.label ? (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="font-medium text-gray-700 whitespace-nowrap min-w-[160px]">
                              {spec.label}:
                            </span>
                            <span className="text-gray-900">{spec.value}</span>
                          </div>
                        ) : (
                          <p key={idx} className="text-gray-900">{spec.value}</p>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Supplier</Label>
                      <p className="mt-1 text-gray-900">{selectedMaterial.supplier_name || '-'}</p>
                    </div>
                    <div>
                      <Label>Estimated Cost</Label>
                      <p className="mt-1 text-gray-900">{formatCurrency(selectedMaterial.estimated_cost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Order Date</Label>
                      <p className="mt-1 text-gray-900">{formatDate(selectedMaterial.order_date)}</p>
                    </div>
                    <div>
                      <Label>Expected Delivery</Label>
                      <p className="mt-1 text-gray-900">{formatDate(selectedMaterial.expected_delivery_date)}</p>
                    </div>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedMaterial.status)}</div>
                  </div>

                  {selectedMaterial.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">{selectedMaterial.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ EDIT MODE: Editable Fields */}
              {isEditing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Material Description *</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.material_description}
                      onChange={(e) => setEditForm({ ...editForm, material_description: e.target.value })}
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-supplier">Supplier</Label>
                      <Input
                        id="edit-supplier"
                        value={editForm.supplier_name}
                        onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-cost">Estimated Cost (£)</Label>
                      <Input
                        id="edit-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.estimated_cost}
                        onChange={(e) => setEditForm({ ...editForm, estimated_cost: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-order-date">Order Date</Label>
                      <Input
                        id="edit-order-date"
                        type="date"
                        value={editForm.order_date}
                        onChange={(e) => setEditForm({ ...editForm, order_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-delivery">Expected Delivery</Label>
                      <Input
                        id="edit-delivery"
                        type="date"
                        value={editForm.expected_delivery_date}
                        onChange={(e) => setEditForm({ ...editForm, expected_delivery_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="delivered_to_customer">Delivered to Customer</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Created/Updated Info */}
              <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
                <p>Created: {formatDate(selectedMaterial.created_at)}</p>
                {selectedMaterial.ordered_by && (
                  <p>Ordered by: {selectedMaterial.ordered_by}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => {
                setMaterialToDelete(selectedMaterial);
                setDeleteDialogOpen(true);
              }}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      setSelectedMaterial(null);
                      setEditForm(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateMaterial}>
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material Order?</AlertDialogTitle>
            <AlertDialogDescription>
              {materialToDelete && (
                <>
                  <p className="mb-2">
                    Are you sure you want to delete this material order?
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <p><strong>Customer:</strong> {materialToDelete.customer_name}</p>
                    <p><strong>Material:</strong> {materialToDelete.material_description.substring(0, 100)}...</p>
                    <p><strong>Status:</strong> {materialToDelete.status.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <p className="mt-3 text-red-600 font-medium">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setMaterialToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMaterial}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProductionMaterialsManagement;