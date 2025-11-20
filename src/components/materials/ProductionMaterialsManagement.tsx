"use client";

import React, { useState, useEffect } from 'react';
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
  Trash2
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
  status: 'not_ordered' | 'ordered' | 'in_transit' | 'delivered' | 'delayed';
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
  project_count?: number; // ✅ ADD THIS LINE
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
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialOrder | null>(null);

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

  // ✅ FIXED: Initial load on mount - only fetch materials
  useEffect(() => {
    console.log('🚀 Component mounted - loading materials...');
    fetchMaterials();
  }, []); // Empty dependency array = run once on mount

  // ✅ OPTIMIZED: Fetch materials with cache busting
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      console.log('📦 Fetching materials...');
      // ✅ Add cache-busting timestamp to prevent stale data
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

  // ✅ OPTIMIZED: Only fetch customers when the dialog is opened
  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      console.log('🔄 Fetching all customers, then filtering for Accepted stage...');
      
      // ✅ Use main customers endpoint (we know this works!)
      const timestamp = new Date().getTime();
      const response = await fetchWithAuth(`customers?_t=${timestamp}`);
      
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();

      console.log('📊 Total customers fetched:', data.length);
      
      // ✅ Filter for Accepted stage on client side
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
      
      // ✅ Immediately reload materials
      await fetchMaterials();
      alert('Material order created successfully!');
      
    } catch (error) {
      console.error('❌ Error creating material order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create material order. Please try again.');
    }
  };

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
      setIsUpdateDialogOpen(false);
      setSelectedMaterial(null);
      
      alert('Material status updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating material status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update material status. Please try again.');
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
      
      // ✅ Immediately reload materials
      await fetchMaterials();
      
      alert('Material order deleted successfully!');
      
    } catch (error) {
      console.error('❌ Error deleting material order:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete material order. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      not_ordered: { 
        className: 'bg-gray-100 text-gray-700 border-gray-300', 
        icon: <Package className="h-3 w-3" />,
        text: 'Not Ordered' 
      },
      ordered: { 
        className: 'bg-blue-100 text-blue-700 border-blue-300', 
        icon: <FileText className="h-3 w-3" />,
        text: 'Ordered' 
      },
      in_transit: { 
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300', 
        icon: <Truck className="h-3 w-3" />,
        text: 'In Transit' 
      },
      delivered: { 
        className: 'bg-green-100 text-green-700 border-green-300', 
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'Delivered' 
      },
      delayed: { 
        className: 'bg-red-100 text-red-700 border-red-300', 
        icon: <AlertTriangle className="h-3 w-3" />,
        text: 'Delayed' 
      },
    };

    const variant = variants[status] || variants.not_ordered;
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

  const filteredMaterials = materials.filter(material => {
    const matchesFilter = filter === 'all' || material.status === filter;
    const matchesSearch = material.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          material.material_description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    not_ordered: materials.filter(m => m.status === 'not_ordered').length,
    ordered: materials.filter(m => m.status === 'ordered').length,
    in_transit: materials.filter(m => m.status === 'in_transit').length,
    delivered: materials.filter(m => m.status === 'delivered').length,
    delayed: materials.filter(m => m.status === 'delayed').length,
  };

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
              onClick={() => {
                // ✅ Only fetch customers when opening the dialog
                fetchCustomers();
              }}
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

      {/* ✅ REMOVED: Yellow alert bar - customers are now lazy-loaded only when needed */}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Not Ordered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.not_ordered}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_transit}</p>
              </div>
              <Truck className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
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
                <SelectItem value="not_ordered">Not Ordered</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
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
            <Card key={material.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {material.customer_name}
                      </h3>
                      {getStatusBadge(material.status)}
                    </div>
                    
                    <p className="text-gray-700 mb-4">{material.material_description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMaterial(material);
                        setIsUpdateDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setMaterialToDelete(material);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Material Status</DialogTitle>
            <DialogDescription>
              Change the status of this material order
            </DialogDescription>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{selectedMaterial.customer_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Material</p>
                <p className="font-medium">{selectedMaterial.material_description}</p>
              </div>

              <div className="space-y-2">
                <Label>New Status</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleUpdateMaterialStatus(selectedMaterial.id, 'ordered')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Mark as Ordered
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleUpdateMaterialStatus(selectedMaterial.id, 'in_transit')}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as In Transit
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleUpdateMaterialStatus(selectedMaterial.id, 'delivered', new Date().toISOString())}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-red-600"
                    onClick={() => handleUpdateMaterialStatus(selectedMaterial.id, 'delayed')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Mark as Delayed
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
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
                    <p><strong>Material:</strong> {materialToDelete.material_description}</p>
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