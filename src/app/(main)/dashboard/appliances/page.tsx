"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Upload, Filter, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import DataImportComponent from "@/components/DataImportComponent";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

// --- New Imports for Modals ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// --- End New Imports ---

// Define the brands for the quick filter
const QUICK_FILTER_BRANDS = ["Bosch", "Siemens", "Neff", "Samsung"];

interface Product {
  id: number;
  model_code: string;
  name: string;
  description?: string;
  series?: string;
  brand?: {
    id: number;
    name: string;
  };
  category?: {
    id: number;
    name: string;
  };
  pricing: {
    base_price?: number;
    low_tier_price?: number;
    mid_tier_price?: number;
    high_tier_price?: number;
  };
  dimensions?: any;
  weight?: number;
  color_options?: string[];
  pack_name?: string;
  energy_rating?: string;
  warranty_years?: number;
  active: boolean;
  in_stock: boolean;
  lead_time_weeks?: number;
}

interface Brand {
  id: number;
  name: string;
  active: boolean;
  product_count: number;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  product_count: number;
}

// --- New Types and Constants for Form Modal ---
interface ProductFormData {
  model_code: string;
  name: string;
  description?: string;
  series?: string;
  brand_id?: number;
  category_id?: number;
  base_price?: number;
  low_tier_price?: number;
  mid_tier_price?: number;
  high_tier_price?: number;
  pack_name?: string;
  energy_rating?: string;
  warranty_years?: number;
}

const EMPTY_FORM_DATA: ProductFormData = {
  model_code: "",
  name: "",
  description: "",
  series: "",
  brand_id: undefined,
  category_id: undefined,
  base_price: undefined,
  low_tier_price: undefined,
  mid_tier_price: undefined,
  high_tier_price: undefined,
  pack_name: "",
  energy_rating: "",
  warranty_years: undefined,
};
// --- End New Types ---

export default function ApplianceCatalogPage() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State for brand checkboxes
  const [selectedBrands, setSelectedBrands] = useState(new Set<string>());

  // State for collapsible filters
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50,
    total: 0,
    pages: 0,
  });

  // --- New State for Modals ---
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<string | null>(null);
  // --- End New State ---

  // Load initial data (brands, categories)
  useEffect(() => {
    loadData();
  }, []);

  // Load products when filters or page change
  useEffect(() => {
    // Only load products if brands/categories are already loaded
    if (!loading) {
      loadProducts();
    }
  }, [selectedBrands, selectedCategory, selectedTier, searchTerm, pagination.page, loading]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Use centralized fetchWithAuth for brands and categories
      const [brandsRes, categoriesRes] = await Promise.all([fetchWithAuth("brands"), fetchWithAuth("categories")]);

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        setBrands(brandsData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      // Set loading false *after* metadata is loaded
      setLoading(false);
      // The useEffect for loadProducts will now run
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.per_page.toString(),
      });

      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory) params.append("category_id", selectedCategory);
      if (selectedTier) params.append("tier", selectedTier);

      // --- New Brand Filter Logic ---
      // Get the IDs for the brand names in the checkbox Set
      const brandIdsToFilter = brands
        .filter((brand) => selectedBrands.has(brand.name))
        .map((brand) => brand.id.toString());

      // Add each ID as a separate 'brand_id' parameter
      // Your backend will need to read this with `request.args.getlist('brand_id')`
      if (brandIdsToFilter.length > 0) {
        brandIdsToFilter.forEach((id) => {
          params.append("brand_id", id);
        });
      }
      // --- End New Logic ---

      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(`products?${params}`);

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages,
        }));
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "—";
    return `£${price.toFixed(2)}`;
  };

  const getProductTierTag = (product: Product): string => {
    const tiers: string[] = [];
    if (product.pricing.low_tier_price) tiers.push("Low");
    if (product.pricing.mid_tier_price) tiers.push("Mid");
    if (product.pricing.high_tier_price) tiers.push("High");
    if (tiers.length === 0) return "—";
    return tiers.join(" / ");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedBrands(new Set<string>()); // Clear checkboxes
    setSelectedCategory("");
    setSelectedTier("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handler for brand checkboxes
  const handleBrandCheckboxChange = (brandName: string, checked: boolean | "indeterminate") => {
    setSelectedBrands((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(brandName);
      } else {
        newSet.delete(brandName);
      }
      return newSet;
    });
  };

  // --- New Modal Handler Functions ---

  const handleAddClick = () => {
    setModalMode("add");
    setSelectedProduct(null);
    setFormData(EMPTY_FORM_DATA);
    setFormError(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    // Flatten product data for the form
    setFormData({
      model_code: product.model_code,
      name: product.name,
      description: product.description || "",
      series: product.series || "",
      brand_id: product.brand?.id,
      category_id: product.category?.id,
      base_price: product.pricing.base_price,
      low_tier_price: product.pricing.low_tier_price,
      mid_tier_price: product.pricing.mid_tier_price,
      high_tier_price: product.pricing.high_tier_price,
      pack_name: product.pack_name || "",
      energy_rating: product.energy_rating || "",
      warranty_years: product.warranty_years,
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  const handleViewClick = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteAlertOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? undefined : parseFloat(value)) : value,
    }));
  };

  const handleSelectChange = (name: "brand_id" | "category_id", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value ? parseInt(value, 10) : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // --- ADD THIS LINE FOR DEBUGGING ---
    console.log("handleSubmit triggered. Mode:", modalMode);
    // --- END DEBUGGING LINE ---

    e.preventDefault();
    setFormError(null);

    const isEdit = modalMode === "edit";

    // 1. Create the payload directly from formData
    const payload = { ...formData };

    // 2. Clean out any keys that are undefined (e.g., an empty number input)
    Object.keys(payload).forEach((key) => (payload as any)[key] === undefined && delete (payload as any)[key]);

    // --- ADD THIS LINE FOR DEBUGGING ---
    console.log("Sending request:", { method: isEdit ? "PUT" : "POST", payload });
    // --- END DEBUGGING LINE ---

    try {
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(isEdit ? `products/${selectedProduct?.id}` : "products", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      // --- ADD THIS LINE FOR DEBUGGING ---
      console.log("Received response:", response);
      // --- END DEBUGGING LINE ---

      if (response.ok) {
        setFormModalOpen(false);
        loadProducts(); // Refresh the table
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData); // Log the error
        setFormError(errorData.error || "An unknown error occurred.");
      }
    } catch (error) {
      console.error(`Error ${modalMode}ing product:`, error);
      setFormError("A network error occurred. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      // Use centralized fetchWithAuth
      const response = await fetchWithAuth(`products/${selectedProduct.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteAlertOpen(false);
        setSelectedProduct(null);
        loadProducts(); // Refresh the table
      } else {
        // Handle error (e.g., show a toast)
        console.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // --- End New Modal Handlers ---

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2 text-sm">Loading appliance catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appliance Catalog</h1>
          <p className="text-muted-foreground">Manage your appliance inventory and pricing tiers</p>
        </div>

        <div className="flex items-center gap-2">
          <DataImportComponent
            onImportComplete={loadData}
            trigger={
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            }
          />
          {/* --- MODIFIED BUTTON --- */}
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
          {/* --- END MODIFIED BUTTON --- */}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Filters */}
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-64 flex-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search products, model codes, or series..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{pagination.total} Products</span>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide" : "Show"} Other Filters
            </Button>
          </div>
        </div>

        {/* Collapsible Filter Dropdowns (for Category and Tier) */}
        {showFilters && (
          <div className="bg-card flex flex-wrap items-center gap-4 rounded-lg border p-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name} ({category.product_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Price Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            {(selectedCategory || selectedTier) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedTier("");
                }}
                size="sm"
              >
                Clear Other Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Checkbox Filters */}
      <div className="flex items-center gap-6">
        {QUICK_FILTER_BRANDS.map((brandName) => (
          <div key={brandName} className="flex items-center space-x-2">
            <Checkbox
              id={`brand-${brandName}`}
              checked={selectedBrands.has(brandName)}
              onCheckedChange={(checked) => handleBrandCheckboxChange(brandName, checked)}
            />
            <Label htmlFor={`brand-${brandName}`} className="cursor-pointer text-sm leading-none font-medium">
              {brandName}
            </Label>
          </div>
        ))}
      </div>

      {/* Products Table */}
      <div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-14 px-2">Model Code</TableHead>
                <TableHead className="h-14 px-2">Name</TableHead>
                <TableHead className="h-14 px-2">Brand</TableHead>
                <TableHead className="h-14 px-2">Series</TableHead>
                <TableHead className="h-14 px-2">Tier</TableHead>
                <TableHead className="h-14 px-2">Base Price</TableHead>
                <TableHead className="h-14 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                // --- MODIFIED TABLEROW ---
                <TableRow
                  key={product.id}
                  onClick={() => handleViewClick(product)}
                  className="hover:bg-muted/50 cursor-pointer"
                >
                  <TableCell className="font-medium">{product.model_code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.pack_name && <p className="text-muted-foreground text-xs">Pack: {product.pack_name}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{product.brand?.name}</TableCell>
                  <TableCell>{product.series || "—"}</TableCell>
                  <TableCell>{getProductTierTag(product)}</TableCell>
                  <TableCell>{formatPrice(product.pricing.base_price)}</TableCell>

                  {/* --- MODIFIED TABLECELL (ACTIONS) --- */}
                  <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                    <div className="flex items-center gap-1">
                      {/* Eye button removed */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Stop click from bubbling to the row
                          handleEditClick(product);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation(); // Stop click from bubbling to the row
                          handleDeleteClick(product);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  {/* --- END MODIFIED TABLECELL --- */}
                </TableRow>
                // --- END MODIFIED TABLEROW ---
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- NEW MODALS --- */}

      {/* Add/Edit Product Modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add New Product" : "Edit Product"}</DialogTitle>
            <DialogDescription>
              {modalMode === "add"
                ? "Fill in the details for the new product."
                : `Editing: ${selectedProduct?.name} (${selectedProduct?.model_code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model_code">Model Code *</Label>
                <Input
                  id="model_code"
                  name="model_code"
                  value={formData.model_code}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_id">Brand *</Label>
                <Select
                  value={formData.brand_id?.toString()}
                  onValueChange={(value) => handleSelectChange("brand_id", value)}
                  required
                >
                  <SelectTrigger id="brand_id">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <Select
                  value={formData.category_id?.toString()}
                  onValueChange={(value) => handleSelectChange("category_id", value)}
                  required
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Series</Label>
                <Input id="series" name="series" value={formData.series} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack_name">Pack Name</Label>
                <Input id="pack_name" name="pack_name" value={formData.pack_name} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (£)</Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price || ""}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="low_tier_price">Low Tier Price (£)</Label>
                <Input
                  id="low_tier_price"
                  name="low_tier_price"
                  type="number"
                  step="0.01"
                  value={formData.low_tier_price || ""}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mid_tier_price">Mid Tier Price (£)</Label>
                <Input
                  id="mid_tier_price"
                  name="mid_tier_price"
                  type="number"
                  step="0.01"
                  value={formData.mid_tier_price || ""}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="high_tier_price">High Tier Price (£)</Label>
                <Input
                  id="high_tier_price"
                  name="high_tier_price"
                  type="number"
                  step="0.01"
                  value={formData.high_tier_price || ""}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">{modalMode === "add" ? "Create Product" : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Product Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.model_code} | {selectedProduct?.brand?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Category:</strong> {selectedProduct?.category?.name}
            </p>
            <p>
              <strong>Series:</strong> {selectedProduct?.series || "N/A"}
            </p>
            <p>
              <strong>Pack Name:</strong> {selectedProduct?.pack_name || "N/A"}
            </p>
            <Separator />
            <h4 className="font-semibold">Pricing</h4>
            <p>
              <strong>Base Price:</strong> {formatPrice(selectedProduct?.pricing.base_price)}
            </p>
            <p>
              <strong>Low Tier:</strong> {formatPrice(selectedProduct?.pricing.low_tier_price)}
            </p>
            <p>
              <strong>Mid Tier:</strong> {formatPrice(selectedProduct?.pricing.mid_tier_price)}
            </p>
            <p>
              <strong>High Tier:</strong> {formatPrice(selectedProduct?.pricing.high_tier_price)}
            </p>
            <Separator />
            <p>
              <strong>Energy Rating:</strong> {selectedProduct?.energy_rating || "N/A"}
            </p>
            <p>
              <strong>Warranty:</strong>{" "}
              {selectedProduct?.warranty_years ? `${selectedProduct.warranty_years} years` : "N/A"}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate the product:
              <br />
              <strong>
                {selectedProduct?.name} ({selectedProduct?.model_code})
              </strong>
              <br />
              This product will be hidden but not permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- END NEW MODALS --- */}
    </div>
  );
}
