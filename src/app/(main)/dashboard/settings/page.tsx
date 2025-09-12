"use client";
import React, { useState, useEffect } from "react";
import { 
  Settings, 
  User, 
  Building2, 
  Users, 
  Palette, 
  Bell, 
  Mail, 
  Shield, 
  Database, 
  Calendar,
  DollarSign,
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
  address: string;
  postcode: string;
  phone: string;
  email: string;
  website: string;
  vat_number: string;
  registration_number: string;
  logo_url: string;
}

interface UserSettings {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Sales' | 'Designer' | 'Installer';
  phone: string;
  department: string;
  is_active: boolean;
}

interface NotificationSettings {
  email_new_leads: boolean;
  email_stage_changes: boolean;
  email_reminders: boolean;
  sms_notifications: boolean;
  desktop_notifications: boolean;
  daily_digest: boolean;
}

interface ProjectType {
  id: string;
  name: string;
  description: string;
  default_markup: number;
  is_active: boolean;
}

interface JobStage {
  id: string;
  name: string;
  order: number;
  color: string;
  is_active: boolean;
}

interface PricingSettings {
  default_markup_percentage: number;
  discount_approval_threshold: number;
  hourly_rate: number;
  consultation_fee: number;
  design_fee: number;
  survey_fee: number;
}

export default function SettingsPage() {
  // State management
  const [activeTab, setActiveTab] = useState("company");
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: "Elite Kitchen Designs",
    address: "123 Design Street, Leicester",
    postcode: "LE1 1AA",
    phone: "0116 123 4567",
    email: "info@elitekitchens.co.uk",
    website: "www.elitekitchens.co.uk",
    vat_number: "GB123456789",
    registration_number: "12345678",
    logo_url: ""
  });

  const [users, setUsers] = useState<UserSettings[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@elitekitchens.co.uk",
      role: "Admin",
      phone: "0116 123 4568",
      department: "Management",
      is_active: true
    },
    {
      id: "2", 
      name: "Sarah Johnson",
      email: "sarah@elitekitchens.co.uk",
      role: "Designer",
      phone: "0116 123 4569",
      department: "Design",
      is_active: true
    }
  ]);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_new_leads: true,
    email_stage_changes: true,
    email_reminders: true,
    sms_notifications: false,
    desktop_notifications: true,
    daily_digest: true
  });

  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([
    {
      id: "1",
      name: "Kitchen",
      description: "Full kitchen design and installation",
      default_markup: 35,
      is_active: true
    },
    {
      id: "2",
      name: "Bedroom",
      description: "Fitted bedroom furniture",
      default_markup: 30,
      is_active: true
    },
    {
      id: "3",
      name: "Study",
      description: "Home office and study furniture",
      default_markup: 25,
      is_active: true
    }
  ]);

  const [jobStages, setJobStages] = useState<JobStage[]>([
    { id: "1", name: "Lead", order: 1, color: "#6B7280", is_active: true },
    { id: "2", name: "Quote", order: 2, color: "#3B82F6", is_active: true },
    { id: "3", name: "Consultation", order: 3, color: "#3B82F6", is_active: true },
    { id: "4", name: "Survey", order: 4, color: "#F59E0B", is_active: true },
    { id: "5", name: "Measure", order: 5, color: "#F59E0B", is_active: true },
    { id: "6", name: "Design", order: 6, color: "#F97316", is_active: true },
    { id: "7", name: "Quoted", order: 7, color: "#F97316", is_active: true },
    { id: "8", name: "Accepted", order: 8, color: "#8B5CF6", is_active: true },
    { id: "9", name: "Production", order: 9, color: "#8B5CF6", is_active: true },
    { id: "10", name: "Installation", order: 10, color: "#6366F1", is_active: true },
    { id: "11", name: "Complete", order: 11, color: "#10B981", is_active: true }
  ]);

  const [pricing, setPricing] = useState<PricingSettings>({
    default_markup_percentage: 35,
    discount_approval_threshold: 10,
    hourly_rate: 75,
    consultation_fee: 150,
    design_fee: 500,
    survey_fee: 100
  });

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingProjectType, setEditingProjectType] = useState<string | null>(null);
  const [editingJobStage, setEditingJobStage] = useState<string | null>(null);

  // Load settings from API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // In real implementation, these would be separate API calls
      // const companyRes = await fetch("http://127.0.0.1:5000/settings/company");
      // const usersRes = await fetch("http://127.0.0.1:5000/settings/users");
      // etc.
      console.log("Loading settings...");
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const saveCompanySettings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings)
      });
      if (!res.ok) throw new Error("Failed to save company settings");
      alert("Company settings saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving company settings");
    }
  };

  const saveNotificationSettings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications)
      });
      if (!res.ok) throw new Error("Failed to save notification settings");
      alert("Notification settings saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving notification settings");
    }
  };

  const savePricingSettings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/settings/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing)
      });
      if (!res.ok) throw new Error("Failed to save pricing settings");
      alert("Pricing settings saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving pricing settings");
    }
  };

  const addUser = () => {
    const newUser: UserSettings = {
      id: Date.now().toString(),
      name: "",
      email: "",
      role: "Sales",
      phone: "",
      department: "",
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
      const res = await fetch(`http://127.0.0.1:5000/settings/users/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting user");
    }
  };

  const addProjectType = () => {
    const newProjectType: ProjectType = {
      id: Date.now().toString(),
      name: "",
      description: "",
      default_markup: 30,
      is_active: true
    };
    setProjectTypes([...projectTypes, newProjectType]);
    setEditingProjectType(newProjectType.id);
  };

  const updateProjectType = (id: string, field: keyof ProjectType, value: any) => {
    setProjectTypes(projectTypes.map(type => 
      type.id === id ? { ...type, [field]: value } : type
    ));
  };

  const deleteProjectType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project type?")) return;
    setProjectTypes(projectTypes.filter(t => t.id !== id));
  };

  const addJobStage = () => {
    const maxOrder = Math.max(...jobStages.map(s => s.order), 0);
    const newStage: JobStage = {
      id: Date.now().toString(),
      name: "",
      order: maxOrder + 1,
      color: "#6B7280",
      is_active: true
    };
    setJobStages([...jobStages, newStage]);
    setEditingJobStage(newStage.id);
  };

  const updateJobStage = (id: string, field: keyof JobStage, value: any) => {
    setJobStages(jobStages.map(stage => 
      stage.id === id ? { ...stage, [field]: value } : stage
    ));
  };

  const deleteJobStage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job stage?")) return;
    setJobStages(jobStages.filter(s => s.id !== id));
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Project Types
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Job Stages
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
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
                    onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input
                    id="company-phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email Address</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-postcode">Postcode</Label>
                  <Input
                    id="company-postcode"
                    value={companySettings.postcode}
                    onChange={(e) => setCompanySettings({...companySettings, postcode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-vat">VAT Number</Label>
                  <Input
                    id="company-vat"
                    value={companySettings.vat_number}
                    onChange={(e) => setCompanySettings({...companySettings, vat_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-reg">Company Registration</Label>
                  <Input
                    id="company-reg"
                    value={companySettings.registration_number}
                    onChange={(e) => setCompanySettings({...companySettings, registration_number: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanySettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
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
                          value={user.name}
                          onChange={(e) => updateUser(user.id, 'name', e.target.value)}
                          placeholder="Name"
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
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Designer">Designer</SelectItem>
                            <SelectItem value="Installer">Installer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="col-span-2"
                          value={user.phone}
                          onChange={(e) => updateUser(user.id, 'phone', e.target.value)}
                          placeholder="Phone"
                        />
                        <Input
                          className="col-span-2"
                          value={user.department}
                          onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                          placeholder="Department"
                        />
                        <div className="col-span-1 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-2 font-medium">{user.name}</div>
                        <div className="col-span-3 text-sm text-gray-600">{user.email}</div>
                        <div className="col-span-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </div>
                        <div className="col-span-2 text-sm text-gray-600">{user.phone}</div>
                        <div className="col-span-2 text-sm text-gray-600">{user.department}</div>
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

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Lead Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified when new leads are created</p>
                  </div>
                  <Switch
                    checked={notifications.email_new_leads}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_new_leads: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Stage Change Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified when job stages change</p>
                  </div>
                  <Switch
                    checked={notifications.email_stage_changes}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_stage_changes: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reminder Notifications</Label>
                    <p className="text-sm text-gray-500">Get reminder notifications for appointments and tasks</p>
                  </div>
                  <Switch
                    checked={notifications.email_reminders}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_reminders: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Receive important notifications via SMS</p>
                  </div>
                  <Switch
                    checked={notifications.sms_notifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, sms_notifications: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-gray-500">Show desktop notifications in your browser</p>
                  </div>
                  <Switch
                    checked={notifications.desktop_notifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, desktop_notifications: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Digest</Label>
                    <p className="text-sm text-gray-500">Receive a daily summary of activities</p>
                  </div>
                  <Switch
                    checked={notifications.daily_digest}
                    onCheckedChange={(checked) => setNotifications({...notifications, daily_digest: checked})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveNotificationSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Types */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Project Types</CardTitle>
                  <CardDescription>
                    Manage the types of projects your company handles
                  </CardDescription>
                </div>
                <Button onClick={addProjectType}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectTypes.map((type) => (
                  <div key={type.id} className="border rounded-lg p-4">
                    {editingProjectType === type.id ? (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <Input
                          className="col-span-3"
                          value={type.name}
                          onChange={(e) => updateProjectType(type.id, 'name', e.target.value)}
                          placeholder="Project Type Name"
                        />
                        <Input
                          className="col-span-5"
                          value={type.description}
                          onChange={(e) => updateProjectType(type.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <Input
                          className="col-span-2"
                          type="number"
                          value={type.default_markup}
                          onChange={(e) => updateProjectType(type.id, 'default_markup', parseFloat(e.target.value))}
                          placeholder="Markup %"
                        />
                        <div className="col-span-1 flex items-center">
                          <Switch
                            checked={type.is_active}
                            onCheckedChange={(checked) => updateProjectType(type.id, 'is_active', checked)}
                          />
                        </div>
                        <div className="col-span-1 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingProjectType(null)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 font-medium">{type.name}</div>
                        <div className="col-span-5 text-sm text-gray-600">{type.description}</div>
                        <div className="col-span-2 text-sm">{type.default_markup}% markup</div>
                        <div className="col-span-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            type.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {type.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="col-span-1 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingProjectType(type.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteProjectType(type.id)}
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

        {/* Job Stages */}
        <TabsContent value="stages">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Job Stages</CardTitle>
                  <CardDescription>
                    Configure the stages that jobs progress through
                  </CardDescription>
                </div>
                <Button onClick={addJobStage}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobStages.sort((a, b) => a.order - b.order).map((stage) => (
                  <div key={stage.id} className="border rounded-lg p-4">
                    {editingJobStage === stage.id ? (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <Input
                          className="col-span-3"
                          value={stage.name}
                          onChange={(e) => updateJobStage(stage.id, 'name', e.target.value)}
                          placeholder="Stage Name"
                        />
                        <Input
                          className="col-span-2"
                          type="number"
                          value={stage.order}
                          onChange={(e) => updateJobStage(stage.id, 'order', parseInt(e.target.value))}
                          placeholder="Order"
                        />
                        <Input
                          className="col-span-3"
                          type="color"
                          value={stage.color}
                          onChange={(e) => updateJobStage(stage.id, 'color', e.target.value)}
                        />
                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            checked={stage.is_active}
                            onCheckedChange={(checked) => updateJobStage(stage.id, 'is_active', checked)}
                          />
                          <span className="text-sm">Active</span>
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingJobStage(null)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 font-medium">{stage.name}</div>
                        <div className="col-span-2 text-sm text-gray-600">Order: {stage.order}</div>
                        <div className="col-span-3 flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: stage.color }}
                          ></div>
                          <span className="text-sm text-gray-600">{stage.color}</span>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            stage.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {stage.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingJobStage(stage.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteJobStage(stage.id)}
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

        {/* Pricing Settings */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Settings</CardTitle>
              <CardDescription>
                Configure default pricing and markup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default-markup">Default Markup Percentage</Label>
                  <Input
                    id="default-markup"
                    type="number"
                    value={pricing.default_markup_percentage}
                    onChange={(e) => setPricing({...pricing, default_markup_percentage: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Default markup applied to supplier costs</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-threshold">Discount Approval Threshold (%)</Label>
                  <Input
                    id="discount-threshold"
                    type="number"
                    value={pricing.discount_approval_threshold}
                    onChange={(e) => setPricing({...pricing, discount_approval_threshold: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Discounts above this require manager approval</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">Hourly Rate (£)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    value={pricing.hourly_rate}
                    onChange={(e) => setPricing({...pricing, hourly_rate: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Standard hourly rate for labour</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation-fee">Consultation Fee (£)</Label>
                  <Input
                    id="consultation-fee"
                    type="number"
                    value={pricing.consultation_fee}
                    onChange={(e) => setPricing({...pricing, consultation_fee: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Fee for initial consultation visits</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="design-fee">Design Fee (£)</Label>
                  <Input
                    id="design-fee"
                    type="number"
                    value={pricing.design_fee}
                    onChange={(e) => setPricing({...pricing, design_fee: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Fee for design and planning services</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="survey-fee">Survey Fee (£)</Label>
                  <Input
                    id="survey-fee"
                    type="number"
                    value={pricing.survey_fee}
                    onChange={(e) => setPricing({...pricing, survey_fee: parseFloat(e.target.value)})}
                  />
                  <p className="text-sm text-gray-500">Fee for site surveys and measurements</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={savePricingSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
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

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure SMTP settings for sending emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-server">SMTP Server</Label>
                    <Input
                      id="smtp-server"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      placeholder="587"
                      type="number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">Password</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="smtp-ssl" />
                  <Label htmlFor="smtp-ssl">Use SSL/TLS encryption</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Email Settings
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

            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                  Configure third-party integrations and API settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Google Calendar</h4>
                        <p className="text-sm text-gray-500">Sync appointments with Google Calendar</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">QuickBooks</h4>
                        <p className="text-sm text-gray-500">Sync invoices and financial data</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Bell className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Slack</h4>
                        <p className="text-sm text-gray-500">Send notifications to Slack channels</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Settings */}
            <Card>
              <CardHeader>
                <CardTitle>API Settings</CardTitle>
                <CardDescription>
                  Manage API keys and webhook configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>API Base URL</Label>
                    <Input value="http://127.0.0.1:5000" readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>API Version</Label>
                    <Input value="v1" readOnly className="bg-gray-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input placeholder="https://your-domain.com/webhook" />
                    <p className="text-sm text-gray-500">URL to receive webhook notifications</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save API Settings
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