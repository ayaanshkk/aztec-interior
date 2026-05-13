'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type Category = 'Kitchen' | 'Bedrooms' | 'Appliances';
type DoorType = 'Basic Slab' | 'Acrylic Gloss/Matt' | 'Vinyl Doors' | 'Black Glass' | 'Base Cabinet Only';
type ApplianceSeries = 'Low' | 'Mid' | 'High';

interface PricelistItem {
  pricelist_id: number;
  item_code: string;
  item_name: string;
  description: string;
  door_type: string;
  base_price: number;
  width: number;
  height: number;
  depth: number;
  category: string;
  brand?: string;  
}

interface GroupedItem {
  item_code: string;
  item_name: string;
  brand?: string; // NEW: For appliances
  width: number;
  height: number;
  depth: number;
  prices: {
    [key: string]: {
      price: number;
      pricelist_id: number;
      series?: string; // For appliances - S2, S4, S6, S8
      model?: string;  // For appliances - model number
    };
  };
}

export default function PricelistPage() {
  const [activeTab, setActiveTab] = useState<Category>('Kitchen');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [pricelistItems, setPricelistItems] = useState<PricelistItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20; // Show 20 grouped items per page
  
  // Edit mode
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newItemForm, setNewItemForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Door types / Series based on active tab
  const doorTypes: DoorType[] = activeTab === 'Kitchen' 
    ? ['Basic Slab', 'Acrylic Gloss/Matt', 'Vinyl Doors', 'Black Glass']
    : activeTab === 'Bedrooms'
    ? ['Basic Slab', 'Acrylic Gloss/Matt', 'Vinyl Doors', 'Black Glass', 'Base Cabinet Only']
    : []; // Appliances doesn't use door types
  
  const applianceSeries: ApplianceSeries[] = ['Low', 'Mid', 'High'];
  const brands = ['All', 'Bosch', 'Siemens', 'Neff', 'Samsung'];

  // Fetch all pricelist items (no backend pagination, we'll paginate grouped results)
  const fetchPricelistItems = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        category: activeTab,
        per_page: 1000
      };
      
      // Add brand filter for Appliances
      if (activeTab === 'Appliances' && selectedBrand !== 'All') {
        filters.brand = selectedBrand;
      }
      
      // @ts-ignore
      const response = await api.getPricelist(filters);
      
      setPricelistItems(response.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBrand]);

  useEffect(() => {
    fetchPricelistItems();
  }, [fetchPricelistItems]);

  // Group items by code and filter by search
  useEffect(() => {
    if (!pricelistItems.length) {
      setGroupedItems([]);
      return;
    }

    // Group differently for Appliances vs Kitchen/Bedrooms
    const grouped = pricelistItems.reduce((acc, item) => {
      // For Appliances, group by item_name + brand (so Bosch and Siemens don't mix!)
      // For Kitchen/Bedrooms, group by item_code
      const groupKey = activeTab === 'Appliances' 
        ? `${item.item_name}|${item.brand || 'Unknown'}` // ← FIXED: Include brand in key
        : item.item_code;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          item_code: groupKey, // For appliances, this will be "HOB 90cm Gas|Bosch"
          item_name: item.item_name,
          brand: item.brand, // ← NEW: Store brand for display
          width: item.width,
          height: item.height,
          depth: item.depth,
          prices: {}
        };
      }
      
      // Extract series info from description for appliances
      let seriesInfo = '';
      if (activeTab === 'Appliances' && item.description) {
        const match = item.description.match(/\(([^)]+)\)/);
        seriesInfo = match ? match[1] : '';
      }
      
      acc[groupKey].prices[item.door_type] = {
        price: item.base_price,
        pricelist_id: item.pricelist_id,
        series: seriesInfo,
        model: activeTab === 'Appliances' ? item.item_code : undefined
      };
      
      return acc;
    }, {} as Record<string, GroupedItem>);

    let items = Object.values(grouped);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.item_code.toLowerCase().includes(query) ||
        item.item_name.toLowerCase().includes(query)
      );
    }

    // Sort by code
    items.sort((a, b) => a.item_code.localeCompare(b.item_code));

    setGroupedItems(items);
    setTotalItems(items.length);
    setTotalPages(Math.ceil(items.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page on data change
  }, [pricelistItems, searchQuery]);

  // Get items for current page
  const paginatedItems = groupedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Handle edit
  const startEdit = (item: GroupedItem) => {
    setEditingCode(item.item_code);
    setEditForm({
      item_code: item.item_code,
      item_name: item.item_name,
      width: item.width,
      height: item.height,
      depth: item.depth,
      prices: { ...item.prices }
    });
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditForm({});
  };

  const saveEdit = async (code: string) => {
    try {
      // Update each door type's price
      const updates = Object.entries(editForm.prices).map(([doorType, data]: [string, any]) => {
        if (data.pricelist_id) {
          // @ts-ignore
          return api.updatePricelistItem(data.pricelist_id, {
            item_name: editForm.item_name,
            base_price: parseFloat(data.price) || 0,
            width: parseInt(editForm.width) || null,
            height: parseInt(editForm.height) || null,
            depth: parseInt(editForm.depth) || null,
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);

      setSuccess('Item updated successfully');
      setEditingCode(null);
      setEditForm({});
      fetchPricelistItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle delete
  const handleDelete = async (item: GroupedItem) => {
    if (!confirm(`Are you sure you want to delete ${item.item_code} with all its door types?`)) return;

    try {
      // Delete all door type rows for this code
      const deletions = Object.values(item.prices).map((data: any) => {
        // @ts-ignore
        return api.deletePricelistItem(data.pricelist_id);
      });

      await Promise.all(deletions);

      setSuccess('Item deleted successfully');
      fetchPricelistItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle Excel upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      // @ts-ignore
      const result = await api.bulkUploadPricelist(uploadFile, activeTab);
      
      setSuccess(`Successfully imported: ${result.items_created} created, ${result.items_updated} updated`);
      setShowUploadModal(false);
      setUploadFile(null);
      fetchPricelistItems();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Handle Excel export
  const handleExport = async () => {
    try {
      // @ts-ignore
      const blob = await api.exportPricelist(activeTab);

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `pricelist_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess('Pricelist exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddItem = async () => {
    try {
      setSaving(true);
      
      // Validation
      if (!newItemForm.item_code || !newItemForm.item_name) {
        alert('Please fill in item code and name');
        return;
      }
      
      if (activeTab === 'Appliances') {
        // Appliances validation
        if (!newItemForm.brand || !newItemForm.series_level || !newItemForm.base_price) {
          alert('Please fill in brand, series level, and price for appliances');
          return;
        }
        
        // Build description for appliances
        const seriesInfo = newItemForm.series_info || '';
        const description = `${newItemForm.item_name} - ${newItemForm.series_level} Series${seriesInfo ? ` (${seriesInfo})` : ''}`;
        
        const itemData = {
          category: activeTab,
          item_code: newItemForm.item_code,
          item_name: newItemForm.item_name,
          description: description,
          base_price: parseFloat(newItemForm.base_price),
          door_type: newItemForm.series_level,
          brand: newItemForm.brand,
          unit: 'each'
        };
        
        // @ts-ignore
        await api.createPricelistItem(itemData);
        
      } else {
        // Kitchen/Bedrooms - Create one row per door type that has a price
        const doorTypesWithPrices = Object.entries(newItemForm.prices || {})
          .filter(([_, price]) => price && parseFloat(price as string) > 0);
        
        if (doorTypesWithPrices.length === 0) {
          alert('Please enter at least one price');
          return;
        }
        
        // Create multiple rows - one for each door type
        const createPromises = doorTypesWithPrices.map(([doorType, price]) => {
          const description = `${newItemForm.item_name} - ${doorType}`;
          
          const itemData = {
            category: activeTab,
            item_code: newItemForm.item_code,
            item_name: newItemForm.item_name,
            description: description,
            base_price: parseFloat(price as string),
            door_type: doorType,
            width: newItemForm.width ? parseInt(newItemForm.width) : null,
            height: newItemForm.height ? parseInt(newItemForm.height) : null,
            depth: newItemForm.depth ? parseInt(newItemForm.depth) : null,
            unit: 'each'
          };
          
          // @ts-ignore
          return api.createPricelistItem(itemData);
        });
        
        await Promise.all(createPromises);
      }
      
      setSuccess(`Item added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Close modal and refresh
      setShowAddModal(false);
      setNewItemForm({});
      fetchPricelistItems();
      
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Price List Management</h1>
              <p className="text-gray-600 mt-1">Manage products, prices, and categories</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setActiveTab('Kitchen')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'Kitchen'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kitchens
            </button>
            <button
              onClick={() => setActiveTab('Bedrooms')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'Bedrooms'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bedrooms
            </button>
            <button
              onClick={() => setActiveTab('Appliances')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'Appliances'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Appliances
            </button>
          </div>

          {/* Search and Brand Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            
            {/* Brand filter for Appliances */}
            {activeTab === 'Appliances' && (
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white min-w-[150px]"
              >
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
            </div>
          ) : groupedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileSpreadsheet className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Try adjusting your search or import Excel data</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeTab === 'Appliances' ? 'Item' : 'Code'}
                      </th>
                      {activeTab !== 'Appliances' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      )}
                      {activeTab === 'Appliances' ? (
                        // Appliances: Show Low Model/Series/Price, Mid Model/Series/Price, High Model/Series/Price
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Low Model
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Series
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mid Model
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Series
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            High Model
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Series
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                        </>
                      ) : (
                        // Kitchen/Bedrooms: Show door types
                        doorTypes.map(doorType => (
                          <th key={doorType} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {doorType}
                          </th>
                        ))
                      )}
                      {activeTab !== 'Appliances' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dimensions (W×H×D)
                        </th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.map((item) => (
                      <tr key={item.item_code} className="hover:bg-gray-50">
                        {editingCode === item.item_code ? (
                          // Edit mode
                          <>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {activeTab === 'Appliances' ? (
                                // Appliances: Show item name + brand (not editable)
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{editForm.item_name}</div>
                                  <div className="text-xs text-gray-500">{editForm.brand}</div>
                                </div>
                              ) : (
                                // Kitchen/Bedrooms: Show code (not editable)
                                <input
                                  type="text"
                                  value={editForm.item_code}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                  disabled
                                />
                              )}
                            </td>
                            {activeTab !== 'Appliances' && (
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.item_name}
                                  onChange={(e) => setEditForm({...editForm, item_name: e.target.value})}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                />
                              </td>
                            )}
                            {activeTab === 'Appliances' ? (
                              // Appliances: Edit Model (disabled), Series (disabled), Price (editable) for each level
                              <>
                                {/* Low */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['Low']?.model || ''}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['Low']?.series || ''}
                                    className="w-12 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {editForm.prices?.['Low'] ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editForm.prices['Low'].price || ''}
                                      onChange={(e) => setEditForm({
                                        ...editForm,
                                        prices: {
                                          ...editForm.prices,
                                          'Low': {
                                            ...editForm.prices['Low'],
                                            price: e.target.value
                                          }
                                        }
                                      })}
                                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                    />
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                
                                {/* Mid */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['Mid']?.model || ''}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['Mid']?.series || ''}
                                    className="w-12 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {editForm.prices?.['Mid'] ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editForm.prices['Mid'].price || ''}
                                      onChange={(e) => setEditForm({
                                        ...editForm,
                                        prices: {
                                          ...editForm.prices,
                                          'Mid': {
                                            ...editForm.prices['Mid'],
                                            price: e.target.value
                                          }
                                        }
                                      })}
                                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                    />
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                
                                {/* High */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['High']?.model || ''}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={editForm.prices?.['High']?.series || ''}
                                    className="w-12 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                                    disabled
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {editForm.prices?.['High'] ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editForm.prices['High'].price || ''}
                                      onChange={(e) => setEditForm({
                                        ...editForm,
                                        prices: {
                                          ...editForm.prices,
                                          'High': {
                                            ...editForm.prices['High'],
                                            price: e.target.value
                                          }
                                        }
                                      })}
                                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                    />
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </>
                            ) : (
                              // Kitchen/Bedrooms: Edit door type prices
                              doorTypes.map(doorType => (
                                <td key={doorType} className="px-4 py-3 whitespace-nowrap">
                                  {editForm.prices[doorType] ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editForm.prices[doorType].price}
                                      onChange={(e) => setEditForm({
                                        ...editForm,
                                        prices: {
                                          ...editForm.prices,
                                          [doorType]: {
                                            ...editForm.prices[doorType],
                                            price: e.target.value
                                          }
                                        }
                                      })}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                    />
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              ))
                            )}
                            {activeTab !== 'Appliances' && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    value={editForm.width || ''}
                                    onChange={(e) => setEditForm({...editForm, width: e.target.value})}
                                    placeholder="W"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                  />
                                  <input
                                    type="number"
                                    value={editForm.height || ''}
                                    onChange={(e) => setEditForm({...editForm, height: e.target.value})}
                                    placeholder="H"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                  />
                                  <input
                                    type="number"
                                    value={editForm.depth || ''}
                                    onChange={(e) => setEditForm({...editForm, depth: e.target.value})}
                                    placeholder="D"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                  />
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => saveEdit(item.item_code)}
                                  className="text-gray-900 hover:text-gray-700"
                                >
                                  <Save className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {activeTab === 'Appliances' ? (
                                <div>
                                  <div>{item.item_name}</div>
                                  <div className="text-xs text-gray-500">{item.brand}</div>
                                </div>
                              ) : (
                                item.item_code
                              )}
                            </td>
                            {activeTab !== 'Appliances' && (
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {item.item_name}
                              </td>
                            )}
                            {activeTab === 'Appliances' ? (
                              // Appliances: Show Model, Series, Price for Low/Mid/High
                              <>
                                {/* Low */}
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['Low']?.model || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['Low']?.series || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {item.prices['Low'] ? `£${item.prices['Low'].price?.toFixed(2) || '0.00'}` : <span className="text-gray-400">-</span>}
                                </td>
                                
                                {/* Mid */}
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['Mid']?.model || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['Mid']?.series || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {item.prices['Mid'] ? `£${item.prices['Mid'].price?.toFixed(2) || '0.00'}` : <span className="text-gray-400">-</span>}
                                </td>
                                
                                {/* High */}
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['High']?.model || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {item.prices['High']?.series || <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {item.prices['High'] ? `£${item.prices['High'].price?.toFixed(2) || '0.00'}` : <span className="text-gray-400">-</span>}
                                </td>
                              </>
                            ) : (
                              // Kitchen/Bedrooms: Show door type prices
                              doorTypes.map(doorType => (
                                <td key={doorType} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {item.prices[doorType] ? (
                                    `£${item.prices[doorType].price?.toFixed(2) || '0.00'}`
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              ))
                            )}
                            {activeTab !== 'Appliances' && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {item.width && item.height && item.depth 
                                  ? `${item.width}×${item.height}×${item.depth}`
                                  : '-'}
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startEdit(item)}
                                  className="text-gray-900 hover:text-gray-700"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="text-gray-900 hover:text-gray-700"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add New Item - {activeTab}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewItemForm({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
      
            <div className="p-6 space-y-4">
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code *
                </label>
                <input
                  type="text"
                  value={newItemForm.item_code || ''}
                  onChange={(e) => setNewItemForm({...newItemForm, item_code: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g., 30B"
                  required
                />
              </div>
      
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItemForm.item_name || ''}
                  onChange={(e) => setNewItemForm({...newItemForm, item_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g., Base Unit 300mm"
                  required
                />
              </div>
      
              {/* Kitchen/Bedrooms: Multiple Door Type Prices */}
              {activeTab !== 'Appliances' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Prices by Door Type</h3>
                  <p className="text-xs text-gray-500 mb-4">Enter prices for each door type (at least one required)</p>
                  
                  <div className="space-y-3">
                    {doorTypes.map(doorType => (
                      <div key={doorType} className="flex items-center gap-3">
                        <label className="w-48 text-sm text-gray-700">{doorType}</label>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={newItemForm.prices?.[doorType] || ''}
                            onChange={(e) => setNewItemForm({
                              ...newItemForm,
                              prices: {
                                ...newItemForm.prices,
                                [doorType]: e.target.value
                              }
                            })}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
      
              {/* Appliances: Brand and Series */}
              {activeTab === 'Appliances' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand *
                    </label>
                    <select
                      value={newItemForm.brand || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, brand: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      required
                    >
                      <option value="">Select brand...</option>
                      {brands.filter(b => b !== 'All').map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
      
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Series Level *
                    </label>
                    <select
                      value={newItemForm.series_level || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, series_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      required
                    >
                      <option value="">Select series...</option>
                      {applianceSeries.map(series => (
                        <option key={series} value={series}>{series}</option>
                      ))}
                    </select>
                  </div>
      
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Series Info (e.g., S6, iQ700, N90)
                    </label>
                    <input
                      type="text"
                      value={newItemForm.series_info || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, series_info: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      placeholder="e.g., S6, iQ700, N90"
                    />
                  </div>
      
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (£) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemForm.base_price || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, base_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </>
              )}
      
              {/* Dimensions - Not for Appliances */}
              {activeTab !== 'Appliances' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={newItemForm.width || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, width: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      placeholder="300"
                    />
                  </div>
      
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={newItemForm.height || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, height: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      placeholder="720"
                    />
                  </div>
      
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depth (mm)
                    </label>
                    <input
                      type="number"
                      value={newItemForm.depth || ''}
                      onChange={(e) => setNewItemForm({...newItemForm, depth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                      placeholder="570"
                    />
                  </div>
                </div>
              )}
            </div>
      
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewItemForm({});
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}