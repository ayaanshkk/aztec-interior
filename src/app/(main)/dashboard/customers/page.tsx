"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, ChevronDown, Link, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch customers from Flask API
  useEffect(() => {
    fetch("http://127.0.0.1:5000/customers")
      .then((res) => res.json())
      .then(setCustomers)
      .catch((err) => console.error("Error fetching customers:", err));
  }, []);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateFormLink = async () => {
    try {
      console.log("🔗 Attempting to generate form link...");
      
      const response = await fetch("http://127.0.0.1:5000/generate-form-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("📡 Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Form link generated:", data);
        const fullLink = `${window.location.origin}/form/${data.token}`;
        setGeneratedLink(fullLink);
        setShowLinkDialog(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("❌ Failed to generate form link:", errorData);
        alert(`Failed to generate form link: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("❌ Network error generating form link:", error);
      // alert(`Network error: ${error.message}. Make sure the backend server is running at http://127.0.0.1:5000`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Master Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> 
                Add Customer
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => console.log("Manual add customer")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manually
              </DropdownMenuItem>
              <DropdownMenuItem onClick={generateFormLink}>
                <Link className="mr-2 h-4 w-4" />
                Generate Form Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.address}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.status}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customer Form Link Generated</DialogTitle>
              <DialogDescription>
                Share this link with your customer to fill out the kitchen design form. 
                Once submitted, they will be automatically added to your customer list.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Input
                value={generatedLink}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyToClipboard} variant="outline">
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {linkCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}