"use client";
import React, { useState, useEffect } from "react";
import { 
  Settings, 
  User, 
  Building2, 
  Users, 
  Shield, 
  Database, 
  FileText,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types for settings data
interface CompanySettings {
  name: string;
  address: string; // Keeping address as it was in original, but not on "fixed" list
  postcode: string;
  phone: string;
  website: string;
}

interface UserSettings {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'Manager' | 'HR' | 'Sales' | 'Production' | 'Staff' | string;
  is_active: boolean;
}

export default function SettingsPage() {
  // State management
  const [activeTab, setActiveTab] = useState("company");
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: "Aztec Interiors",
    address: "123 Design Street, Leicester", // This field remains editable as it wasn't on the "fixed" list
    postcode: "LE1 1AA",
    phone: "0116 123 4567",
    website: "www.aztec-interiors.co.uk",
  });

  // --- CHANGE HERE ---
  // Initial user state is now an empty array instead of dummy data.
  // The list will be populated by the fetchSettings function on component load.
  const [users, setUsers] = useState<UserSettings[]>([]);
  // --- END CHANGE ---

  const [editingUser, setEditingUser] = useState<string | null>(null);

  // Load settings from API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch all users
      const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
      if (!token) {
        console.warn("No auth token found, cannot fetch users.");
        return;
      }

      // This endpoint correctly fetches ALL users as requested previously
      const usersRes = await fetch("http://127.0.0.1:5000/auth/users", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersRes.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const usersData = await usersRes.json();
      setUsers(usersData.users); // Assuming API returns { users: [...] }
      
      console.log("Users loaded successfully");

    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const saveCompanySettings = async () => {
    // This only saves the address now, as other fields are read-only
    try {
      const res = await fetch("http://127.0.0.1:5000/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: companySettings.address }) // Only send editable fields
      });
      if (!res.ok) throw new Error("Failed to save company settings");
      alert("Company settings saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving company settings");
    }
  };


  const addUser = () => {
    const newUser: UserSettings = {
      id: Date.now().toString(),
      first_name: "",
      last_name: "",
      email: "",
      role: "Staff",
      is_active: true
    };
    setUsers([...users, newUser]);
    setEditingUser(newUser.id);
  };

  const updateUser = (id: string, field: keyof UserSettings, value: any) => {
    setUsers(users.map(user => 
      user.id === id ? { ...user, [field]: value } : user
    ));
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      // Assuming you need to pass a token for auth
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:5000/settings/users/${id}`, { // This endpoint might need to be /auth/users/<id>
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting user");
    }
  };
  
  // This function would be called by the switch, but the backend route
  // /auth/users/<int:user_id>/toggle-status is a POST route, so
  // updateUser state change should be followed by a save/API call.
  // For simplicity, we just update state, but a real save would be needed.
  const toggleUserStatus = async (id: string, newStatus: boolean) => {
    updateUser(id, 'is_active', newStatus);
    // In a real app, you'd call the /toggle-status endpoint here
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:5000/auth/users/${id}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      console.log("User status toggled successfully");
    } catch (err) {
      console.error("Error toggling user status:", err);
      // Revert state on failure
      updateUser(id, 'is_active', !newStatus);
      alert("Error updating user status");
    }
  };


  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company details and branding information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companySettings.name}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input
                    id="company-phone"
                    value={companySettings.phone}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={companySettings.website}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-postcode">Postcode</Label>
                  <Input
                    id="company-postcode"
                    value={companySettings.postcode}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  placeholder="Enter company address"
                />
                 <p className="text-sm text-gray-500">Only the address is editable.</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanySettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions
                  </CardDescription>
                </div>
                <Button onClick={addUser}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    {editingUser === user.id ? (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <Input
                          className="col-span-2"
                          value={user.first_name}
                          onChange={(e) => updateUser(user.id, 'first_name', e.target.value)}
                          placeholder="First Name"
                        />
                        <Input
                          className="col-span-2"
                          value={user.last_name}
                          onChange={(e) => updateUser(user.id, 'last_name', e.target.value)}
                          placeholder="Last Name"
                        />
                        <Input
                          className="col-span-3"
                          value={user.email}
                          onChange={(e) => updateUser(user.id, 'email', e.target.value)}
                          placeholder="Email"
                        />
                        <Select value={user.role} onValueChange={(value) => updateUser(user.id, 'role', value)}>
                          <SelectTrigger className="col-span-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Production">Production</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="col-span-2 flex items-center gap-2">
                           <Switch
                            checked={user.is_active}
                            onCheckedChange={(checked) => updateUser(user.id, 'is_active', checked)}
                          />
                          <Label>{user.is_active ? "Active" : "Inactive"}</Label>
                        </div>
                        <div className="col-span-1 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                            {/* TODO: Add save user logic here */}
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 font-medium">{user.first_name} {user.last_name}</div>
                        <div className="col-span-3 text-sm text-gray-600">{user.email}</div>
                        <div className="col-span-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </div>
                        <div className="col-span-2">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="col-span-1 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUser(user.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="space-y-6">
            {/* Backup & Data */}
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Backup and data management options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Database Backup</h4>
                    <p className="text-sm text-gray-500">Create a backup of all customer and project data</p>
                  </div>
                  <Button variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Create Backup
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Export Customer Data</h4>
                    <p className="text-sm text-gray-500">Export customer data as CSV file</p>
                  </div>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and access control settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Require 2FA for all user accounts</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-logout after inactivity</Label>
                    <p className="text-sm text-gray-500">Automatically log out users after 30 minutes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Complexity Requirements</Label>
                    <p className="text-sm text-gray-500">Enforce strong password policies</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    defaultValue="30"
                    className="w-32"
                  />
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Shield className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}