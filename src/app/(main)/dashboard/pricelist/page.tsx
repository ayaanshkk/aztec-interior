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

type Category = 'Kitchen' | 'Bedrooms';
type DoorType = 'Basic Slab' | 'Acrylic Gloss/Matt' | 'Vinyl Doors' | 'Black Glass' | 'Base Cabinet Only';

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
}

interface GroupedItem {
  item_code: string;
  item_name: string;
  width: number;
  height: number;
  depth: number;
  prices: {
    [key: string]: {
      price: number;
      pricelist_id: number;
    };
  };
}

export default function PricelistPage() {
  const [activeTab, setActiveTab] = useState<Category>('Kitchen');
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

  // Door types based on active tab
  const doorTypes: DoorType[] = activeTab === 'Kitchen' 
    ? ['Basic Slab', 'Acrylic Gloss/Matt', 'Vinyl Doors', 'Black Glass']
    : ['Basic Slab', 'Acrylic Gloss/Matt', 'Vinyl Doors', 'Black Glass', 'Base Cabinet Only'];

  // Fetch all pricelist items (no backend pagination, we'll paginate grouped results)
  const fetchPricelistItems = useCallback(async () => {
    try {
      setLoading(true);
      // @ts-ignore
      const response = await api.getPricelist({
        category: activeTab,
        per_page: 1000 // Get all items for this category
      });
      
      setPricelistItems(response.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPricelistItems();
  }, [fetchPricelistItems]);

  // Group items by code and filter by search
  useEffect(() => {
    if (!pricelistItems.length) {
      setGroupedItems([]);
      return;
    }

    // Group by item_code
    const grouped = pricelistItems.reduce((acc, item) => {
      const code = item.item_code;
      
      if (!acc[code]) {
        acc[code] = {
          item_code: code,
          item_name: item.item_name,
          width: item.width,
          height: item.height,
          depth: item.depth,
          prices: {}
        };
      }
      
      acc[code].prices[item.door_type] = {
        price: item.base_price,
        pricelist_id: item.pricelist_id
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
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
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
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
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      {doorTypes.map(doorType => (
                        <th key={doorType} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {doorType}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dimensions (W×H×D)
                      </th>
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
                              <input
                                type="text"
                                value={editForm.item_code}
                                onChange={(e) => setEditForm({...editForm, item_code: e.target.value})}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                                disabled
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={editForm.item_name}
                                onChange={(e) => setEditForm({...editForm, item_name: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                              />
                            </td>
                            {doorTypes.map(doorType => (
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
                            ))}
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
                              {item.item_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.item_name}
                            </td>
                            {doorTypes.map(doorType => (
                              <td key={doorType} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {item.prices[doorType] ? (
                                  `£${item.prices[doorType].price?.toFixed(2) || '0.00'}`
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {item.width && item.height && item.depth 
                                ? `${item.width}×${item.height}×${item.depth}`
                                : '-'}
                            </td>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Import from Excel</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importing to: <span className="font-bold">{activeTab}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excel File
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-900 transition">
                    <div className="space-y-1 text-center">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-gray-900 hover:text-gray-700">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">XLSX or XLS files only</p>
                      {uploadFile && (
                        <p className="text-sm text-gray-900 font-medium">
                          Selected: {uploadFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Items will be created for each door type found in the Excel file. 
                    Existing items will be updated.
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}