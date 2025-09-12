import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: () => void;
}

export function CreateCustomerModal({ isOpen, onClose, onCustomerCreated }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    marketing_opt_in: false,
    notes: '',
    salesperson: '',
    project_types: [] as string[], // Changed back to array for multiple types
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleProjectType = (type: string) => {
    setFormData(prev => {
      const exists = prev.project_types.includes(type);
      return {
        ...prev,
        project_types: exists ? prev.project_types.filter(t => t !== type) : [...prev.project_types, type]
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    setIsSubmitting(true);

    try {
      // Prepare payload
      const payload = {
        ...formData,
        created_by: 'Current User'
      };

      const response = await fetch('http://127.0.0.1:5000/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      const result = await response.json();
      console.log('Customer created:', result);

      // Reset form
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        marketing_opt_in: false,
        notes: '',
        salesperson: '',
        project_types: []
      });

      onCustomerCreated();
      onClose();
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const salespeople = [
    { id: 'alice', name: 'Alice Smith' },
    { id: 'ben', name: 'Ben Johnson' },
    { id: 'clara', name: 'Clara Jones' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your database. You can generate forms for them later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salesperson</Label>
              <Select
                value={formData.salesperson}
                onValueChange={(value) => handleInputChange('salesperson', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map(sp => (
                    <SelectItem key={sp.id} value={sp.name}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Job Type</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="project-bedroom"
                    checked={formData.project_types.includes('Bedroom')}
                    onCheckedChange={() => toggleProjectType('Bedroom')}
                  />
                  <Label htmlFor="project-bedroom" className="text-sm font-normal">
                    Bedroom
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="project-kitchen"
                    checked={formData.project_types.includes('Kitchen')}
                    onCheckedChange={() => toggleProjectType('Kitchen')}
                  />
                  <Label htmlFor="project-kitchen" className="text-sm font-normal">
                    Kitchen
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="marketing_opt_in"
              checked={formData.marketing_opt_in}
              onCheckedChange={(checked) => handleInputChange('marketing_opt_in', !!checked)}
            />
            <Label htmlFor="marketing_opt_in">
              Customer consents to marketing communications
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes or comments"
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}