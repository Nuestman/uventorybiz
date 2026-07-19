import React, { useState, useRef, useEffect } from 'react';
import type { RouteComponentProps } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Search, Package, Edit, Trash2, Eye, Hospital, Download, Upload, Ambulance, BookOpen, MoreHorizontal, ClipboardList, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useAuth } from '@/hooks/useAuth';
import { InventoryCategoriesDialog } from '@/components/InventoryCategoriesDialog';
import {
  INVENTORY_CATEGORY_FIELD_CONFIG,
  type InventoryFieldTemplate,
} from '@shared/inventoryCategories';

type InventoryCategoryOption = {
  id: string;
  name: string;
  slug: string;
  itemCodePrefix: string;
  fieldTemplate: string;
  sortOrder: number;
  isActive: boolean;
};

interface MedicalInventory {
  id: string;
  // Master item id (from catalog) used for requisitions/transfers
  itemId?: string;
  itemCode: string;
  itemName: string;
  description?: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unitOfMeasure: string;
  dosageForm?: string;
  unitCost?: number;
  supplier?: string;
  brand?: string; // Equipment manufacturer (form shows "Manufacturer", stored in brand)
  locationId?: string | null;
  location?: string | { id: string; locationName: string; locationCode: string; } | null; // Can be text (legacy) or location object
  expiryDate?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  status: 'active' | 'inactive' | 'discontinued';
  equipmentStatus?: 'functional' | 'faulty' | 'maintenance' | 'decommissioned';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

interface NewInventoryItem {
  itemCode: string;
  itemName: string;
  description?: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unitOfMeasure: string;
  dosageForm?: string;
  unitCost?: number;
  supplier?: string;
  location?: string;
  expiryDate?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  status: 'active' | 'inactive' | 'discontinued';
  equipmentStatus?: 'functional' | 'faulty' | 'maintenance' | 'decommissioned';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
}

interface NewRequisitionItem {
  itemId: string;
  requestedQuantity: number;
  unitOfMeasure?: string;
  unitCost?: string;
}

export type InventoryProps = {
  /** When true, only stock at fleet vehicle care locations; used inside Fleet module. */
  ambulanceInventoryMode?: boolean;
};

const unitsOfMeasure = [
  'pieces', 'boxes', 'packs', 'sets', 'kits', 'units', 'pairs',
  'liters', 'milliliters', 'grams', 'kilograms', 'meters', 'rolls', 'sheets', 'tubes'
];

const dosageForms = [
  'tablets', 'capsules', 'vials', 'ampoules', 'syringes', 'injections',
  'drops', 'creams', 'ointments', 'patches', 'solutions', 'suspensions'
];

const equipmentStatuses = [
  { value: 'functional', label: 'Functional' },
  { value: 'faulty', label: 'Faulty' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' }
];

const getCategoryLabel = (
  categorySlug: string,
  categories: InventoryCategoryOption[],
): string =>
  categories.find((c) => c.slug === categorySlug)?.name
  ?? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function Inventory(props: InventoryProps & Partial<RouteComponentProps>) {
  const { ambulanceInventoryMode = false } = props;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { isMultiLocation, activeLocation } = useActiveLocation();
  const { formatCurrency } = useTenantSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [createTargetAmbulanceId, setCreateTargetAmbulanceId] = useState('');
  useEffect(() => {
    if (ambulanceInventoryMode) return;
    const loc = new URLSearchParams(window.location.search).get("locationId");
    if (loc?.trim()) setSelectedLocation(loc.trim());
  }, [ambulanceInventoryMode]);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicalInventory | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [importResult, setImportResult] = useState<{ created: number; total: number; errors?: { row: number; error: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequisitionItems, setNewRequisitionItems] = useState<NewRequisitionItem[]>([
    { itemId: '', requestedQuantity: 0 },
  ]);
  const [requisitionNotes, setRequisitionNotes] = useState('');
  const [selectedFulfillingLocationId, setSelectedFulfillingLocationId] = useState<string>('');
  /** When opening Request stock from a low-stock row — match against supplying-location inventory by master id / code. */
  const [requisitionPrefill, setRequisitionPrefill] = useState<{
    masterItemId: string;
    itemCode: string;
    itemName: string;
    suggestedQty: number;
  } | null>(null);
  const [, setLocation] = useLocation();
  const [inventoryPage, setInventoryPage] = useState(1);
  const PAGE_SIZE = 20;
  const [newItem, setNewItem] = useState<NewInventoryItem>({
    itemCode: '',
    itemName: '',
    description: '',
    category: '',
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    unitOfMeasure: '',
    dosageForm: '',
    unitCost: 0,
    supplier: '',
    location: '',
    expiryDate: '',
    batchNumber: '',
    lotNumber: '',
    serialNumber: '',
    status: 'active',
    equipmentStatus: 'functional',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    warrantyExpiry: ''
  });

  // Auto-generate item code when category or name changes
  // Helper to format dates for input[type="date"]
  const formatDateForInput = (dateValue: string | undefined | null): string => {
    if (!dateValue) return '';
    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Otherwise parse and format to YYYY-MM-DD
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const { data: inventoryCategories = [] } = useQuery({
    queryKey: ['/api/inventory-categories'],
    queryFn: async () => {
      const res = await fetch('/api/inventory-categories', { credentials: 'include' });
      if (!res.ok) return [];
      return (await res.json()) as InventoryCategoryOption[];
    },
  });

  const generateItemCode = (categorySlug: string, itemName: string) => {
    if (!categorySlug || !itemName) return '';
    const categoryPrefix =
      inventoryCategories.find((cat) => cat.slug === categorySlug)?.itemCodePrefix || 'ITM';
    const namePrefix = itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${categoryPrefix}-${namePrefix}${timestamp}`;
  };

  const getFieldTemplateForCategory = (categorySlug: string): InventoryFieldTemplate => {
    const tpl = inventoryCategories.find((c) => c.slug === categorySlug)?.fieldTemplate;
    if (tpl === 'medication' || tpl === 'supplies' || tpl === 'equipment' || tpl === 'consumables') {
      return tpl;
    }
    return 'supplies';
  };

  // Get fields to show based on selected category's field template
  const getFieldsForCategory = (categorySlug: string) => {
    return INVENTORY_CATEGORY_FIELD_CONFIG[getFieldTemplateForCategory(categorySlug)] || {
      required: ['itemName', 'category', 'unitOfMeasure'],
      optional: ['description', 'supplier', 'expiryDate', 'batchNumber'],
      labels: {}
    };
  };

  const currentFields = getFieldsForCategory(newItem.category);
  const shouldShowField = (fieldName: string) => {
    if (!newItem.category) return true; // Show all fields if no category selected
    return currentFields.required.includes(fieldName) || currentFields.optional.includes(fieldName);
  };

  const getFieldLabel = (fieldName: string) => {
    return currentFields.labels[fieldName as keyof typeof currentFields.labels] || 
           fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      console.log('Uploading inventory image:', file.name);
      
      const response = await fetch('/api/inventory-image-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Upload response status:', response.status);
      
      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      console.log('Upload response text:', responseText);

      if (!response.ok) {
        throw new Error(responseText || 'Upload failed');
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid server response');
      }

      setUploadedImageUrl(data.imageUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Item image uploaded successfully",
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Fetch care locations (for filters and location display)
  const { data: allCareLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !ambulanceInventoryMode,
  });

  const { data: ambulanceFleet = [] } = useQuery({
    queryKey: ['/api/fleet', { includeInactive: true, ui: 'inventory-filter' }],
    queryFn: async () => {
      const res = await fetch('/api/fleet?includeInactive=true', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: ambulanceInventoryMode,
  });

  const primaryLocation =
    (allCareLocations as any[]).find((loc: any) => loc.isPrimary) ||
    (allCareLocations as any[])[0];

  // Fetch inventory items for main table (filtered)
  const { data: inventory = [], isLoading } = useQuery<MedicalInventory[]>({
    queryKey: [
      '/api/inventory',
      {
        category: selectedCategory,
        status: selectedStatus,
        location: selectedLocation,
        lowStock: showLowStock,
        fleetOnly: ambulanceInventoryMode,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (ambulanceInventoryMode) {
        params.append('fleetOnly', 'true');
        params.append('allLocations', 'true');
        if (selectedLocation && selectedLocation !== 'all') {
          params.append('locationId', selectedLocation);
        }
      } else if (selectedLocation && selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      } else {
        // Explicitly request all locations so server does not default to session/primary only
        params.append('allLocations', 'true');
      }
      if (showLowStock) params.append('lowStock', 'true');

      const response = await fetch(`/api/inventory?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch inventory for requisition modal: only items at selected supplying (fulfilling) location
  const { data: requisitionInventory = [], isFetched: requisitionInventoryFetched } = useQuery<MedicalInventory[]>({
    queryKey: ['/api/inventory', 'requisition', selectedFulfillingLocationId],
    queryFn: async () => {
      if (!selectedFulfillingLocationId) return [];
      const params = new URLSearchParams();
      params.set('locationId', selectedFulfillingLocationId);
      const response = await fetch(`/api/inventory?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch inventory for supplying location');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedFulfillingLocationId,
  });

  // Fetch inventory at requesting location (your store) for requisition modal – to show "current at your store"
  const { data: requestingLocationInventory = [] } = useQuery<MedicalInventory[]>({
    queryKey: ['/api/inventory', 'requesting', activeLocation?.id],
    queryFn: async () => {
      if (!activeLocation?.id) return [];
      const params = new URLSearchParams();
      params.set('locationId', activeLocation.id);
      const response = await fetch(`/api/inventory?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch inventory at your location');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isRequestModalOpen && !!activeLocation?.id,
  });

  // Fetch care locations for edit mode (allow changing location on edit)
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations', 'edit'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: editingItem !== null && !ambulanceInventoryMode,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: NewInventoryItem) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create inventory item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Inventory item created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewInventoryItem> }) => {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update inventory item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setEditingItem(null);
      setIsAddModalOpen(false); // Close modal after successful update
      resetForm();
      toast({
        title: "Success",
        description: "Inventory item updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive"
      });
    }
  });

  // Create stock requisition (clinic/FAP → central or other location)
  const createRequisitionMutation = useMutation({
    mutationFn: async (data: {
      requestingLocationId: string;
      fulfillingLocationId: string;
      notes?: string;
      items: NewRequisitionItem[];
    }) => {
      const response = await fetch('/api/stock-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create stock requisition');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsRequestModalOpen(false);
      setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
      setRequisitionNotes('');
      setRequisitionPrefill(null);
      queryClient.invalidateQueries({ queryKey: ['/api/stock-requisitions'] });
      toast({
        title: 'Requisition submitted',
        description: 'Your stock request has been sent for processing.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit requisition',
        variant: 'destructive',
      });
    },
  });

  const addRequisitionItemRow = () => {
    setNewRequisitionItems((prev) => [...prev, { itemId: '', requestedQuantity: 0 }]);
  };

  const removeRequisitionItemRow = (index: number) => {
    setNewRequisitionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRequisitionItemRow = (index: number, field: keyof NewRequisitionItem, value: any) => {
    setNewRequisitionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmitRequisition = async () => {
    if (!activeLocation?.id) {
      toast({
        title: 'Location required',
        description: 'Please select your working location before requesting stock.',
        variant: 'destructive',
      });
      return;
    }

    const validItems = newRequisitionItems.filter(
      (item) => item.itemId && item.requestedQuantity && item.requestedQuantity > 0,
    );

    if (validItems.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please add at least one item with a positive quantity.',
        variant: 'destructive',
      });
      return;
    }

    const fulfillingId = selectedFulfillingLocationId || primaryLocation?.id;
    if (!fulfillingId) {
      toast({
        title: 'No fulfilling location',
        description:
          'Please select where to request stock from (central store or another location).',
        variant: 'destructive',
      });
      return;
    }
    if (fulfillingId === activeLocation.id) {
      toast({
        title: 'Invalid selection',
        description: 'Requesting and fulfilling location cannot be the same.',
        variant: 'destructive',
      });
      return;
    }

    // Guard rail: ensure we don't request more than available at supplying location
    const overRequested = validItems.find((item) => {
      const stockItem = requisitionInventory.find((inv) => inv.id === item.itemId);
      return stockItem && item.requestedQuantity > stockItem.currentStock;
    });
    if (overRequested) {
      const stockItem = requisitionInventory.find((inv) => inv.id === overRequested.itemId);
      toast({
        title: 'Quantity too high',
        description: stockItem
          ? `You requested ${overRequested.requestedQuantity} but only ${stockItem.currentStock} is available at the supplying location.`
          : 'Requested quantity exceeds available stock at the supplying location.',
        variant: 'destructive',
      });
      return;
    }

    // Map UI itemId (stock row id) to master item id for API payload
    const itemsForApi = validItems.map((item) => {
      const stock = requisitionInventory.find((inv) => inv.id === item.itemId) as any;
      return {
        ...item,
        itemId: (stock?.itemId as string) ?? item.itemId,
      };
    });

    await createRequisitionMutation.mutateAsync({
      requestingLocationId: activeLocation.id,
      fulfillingLocationId: fulfillingId,
      notes: requisitionNotes || undefined,
      items: itemsForApi,
    });
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete inventory item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Success",
        description: "Inventory item deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setNewItem({
      itemCode: '',
      itemName: '',
      description: '',
      category: '',
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      unitOfMeasure: '',
      dosageForm: '',
      unitCost: 0,
      supplier: '',
      location: '',
      expiryDate: '',
      batchNumber: '',
      lotNumber: '',
      serialNumber: '',
      status: 'active',
      equipmentStatus: 'functional',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      warrantyExpiry: ''
    });
    setUploadedImageUrl('');
    setSelectedLocationId('');
    setCreateTargetAmbulanceId('');
  };

  const handleExport = async (category: string = 'all') => {
    try {
      const url = category === 'all' ? '/api/inventory/export' : `/api/inventory/export?category=${encodeURIComponent(category)}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match ? match[1] : `inventory_${category}_${new Date().toISOString().split('T')[0]}.csv`;
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(a.href);
      toast({ title: 'Export complete', description: category === 'all' ? 'All inventory exported.' : `${category} inventory exported.` });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message || 'Could not export', variant: 'destructive' });
    }
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          inQuotes = !inQuotes;
          if (!inQuotes && line[j + 1] === '"') { current += '"'; j++; }
        } else if ((ch === ',' && !inQuotes) || ch === '\n') {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      header.forEach((h, j) => { row[h] = values[j] ?? ''; });
      rows.push(row);
    }
    return rows;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: 'Import failed', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
        setIsImporting(false);
        e.target.value = '';
        return;
      }
      // Same resolution as create: active session location → primary → first care location
      const locationId =
        activeLocation?.id
        || (allCareLocations as { id?: string; isPrimary?: boolean }[]).find((loc) => loc.isPrimary)?.id
        || (allCareLocations as { id?: string }[])[0]?.id;
      if (!locationId) {
        toast({
          title: 'Import failed',
          description: 'Select your working location (or ensure a store location exists) before importing.',
          variant: 'destructive',
        });
        setIsImporting(false);
        e.target.value = '';
        return;
      }
      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: rows,
          locationId,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Import failed');
      const data = await response.json();
      setImportResult({
        created: Array.isArray(data.created) ? data.created.length : Number(data.created) || 0,
        total: data.total,
        errors: data.errors,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      const createdCount = Array.isArray(data.created) ? data.created.length : Number(data.created) || 0;
      toast({ title: 'Import complete', description: `${createdCount} of ${data.total} rows imported.` });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message || 'Could not import', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleEdit = (item: MedicalInventory) => {
    setEditingItem(item);
    setUploadedImageUrl((item as any).imageUrl || '');
    // Set location ID from record (used to preselect location in edit dropdown)
    setSelectedLocationId((item as any).locationId || '');
    setNewItem({
      itemCode: item.itemCode,
      itemName: item.itemName,
      description: item.description || '',
      category: item.category,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      maximumStock: item.maximumStock || 0,
      unitOfMeasure: item.unitOfMeasure,
      dosageForm: item.dosageForm || '',
      unitCost: item.unitCost || 0,
      supplier: item.supplier || item.brand || '', // brand = equipment manufacturer
      location: typeof item.location === 'string'
        ? item.location
        : (item.location as any)?.locationCode || (item.location as any)?.locationName || '',
      expiryDate: formatDateForInput(item.expiryDate),
      batchNumber: item.batchNumber || '',
      lotNumber: item.lotNumber || '',
      serialNumber: item.serialNumber || '',
      status: item.status,
      equipmentStatus: item.equipmentStatus || 'functional',
      lastMaintenanceDate: formatDateForInput(item.lastMaintenanceDate),
      nextMaintenanceDate: formatDateForInput(item.nextMaintenanceDate),
      warrantyExpiry: formatDateForInput(item.warrantyExpiry)
    });
    setIsAddModalOpen(true);
  };

  // Handle input changes with auto-generation
  const handleInputChange = (field: string, value: any) => {
    const updatedItem = { ...newItem, [field]: value };
    
    // Auto-generate item code when category or name changes (only for new items)
    if ((field === 'category' || field === 'itemName') && !editingItem) {
      const newCode = generateItemCode(
        field === 'category' ? value : updatedItem.category,
        field === 'itemName' ? value : updatedItem.itemName
      );
      updatedItem.itemCode = newCode;
    }
    
    setNewItem(updatedItem);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up data - convert empty date strings to undefined to avoid database errors
    const cleanedData: any = {
      ...newItem,
      imageUrl: uploadedImageUrl || (editingItem as any)?.imageUrl || undefined,
      expiryDate: newItem.expiryDate || undefined,
      lastMaintenanceDate: newItem.lastMaintenanceDate || undefined,
      nextMaintenanceDate: newItem.nextMaintenanceDate || undefined,
      warrantyExpiry: newItem.warrantyExpiry || undefined,
      // Remove empty strings and convert to undefined for optional fields
      description: newItem.description || undefined,
      supplier: newItem.supplier || undefined,
      batchNumber: newItem.batchNumber || undefined,
      lotNumber: newItem.lotNumber || undefined,
      serialNumber: newItem.serialNumber || undefined,
      dosageForm: newItem.dosageForm || undefined,
      equipmentStatus: newItem.equipmentStatus || undefined
    };
    cleanedData.category = newItem.category;

    // Equipment template: form "Manufacturer" (supplier) -> DB brand column
    if (getFieldTemplateForCategory(newItem.category) === 'equipment' && newItem.supplier) {
      cleanedData.brand = newItem.supplier;
    }
    
    // Remove location field from data sent to backend
    delete cleanedData.location;
    
    // Add locationId if editing and user selected (or kept) a location
    if (editingItem) {
      if (selectedLocationId) {
        cleanedData.locationId = selectedLocationId;
      } else if ((editingItem as any).locationId) {
        // Preserve existing locationId if user didn't change selection
        cleanedData.locationId = (editingItem as any).locationId;
      }
    } else if (ambulanceInventoryMode) {
      const aid = createTargetAmbulanceId?.trim();
      if (!aid) {
        toast({
          title: 'Vehicle required',
          description: 'Select which fleet unit this stock line belongs to.',
          variant: 'destructive',
        });
        return;
      }
      cleanedData.locationId = aid;
    } else {
      // For create mode, explicitly attach locationId instead of relying only on middleware
      // Multi-location tenants: use active session location
      if (isMultiLocation && activeLocation?.id) {
        cleanedData.locationId = activeLocation.id;
      }
      // Single-location tenants (or when no activeLocation): use primary/default care location if available
      if (!cleanedData.locationId) {
        const primary = (allCareLocations as any[]).find(loc => loc.isPrimary) || (allCareLocations as any[])[0];
        if (primary) {
          cleanedData.locationId = primary.id;
        }
      }
    }
    
    // Ensure item code is generated if not already set
    if (!cleanedData.itemCode && !editingItem) {
      const code = generateItemCode(newItem.category, newItem.itemName);
      cleanedData.itemCode = code;
    }
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const getStockStatus = (item: MedicalInventory) => {
    if (item.currentStock <= 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, needsReorder: true };
    }
    if (item.currentStock <= item.minimumStock) {
      return { label: 'Low Stock', variant: 'destructive' as const, needsReorder: true };
    }
    if (item.maximumStock && item.currentStock >= item.maximumStock) {
      return { label: 'Overstock', variant: 'secondary' as const, needsReorder: false };
    }
    return { label: 'In Stock', variant: 'default' as const, needsReorder: false };
  };

  const suggestedReorderQty = (item: MedicalInventory) => {
    const min = item.minimumStock ?? 0;
    const max = item.maximumStock ?? 0;
    if (max > item.currentStock) return Math.max(1, max - item.currentStock);
    if (min > item.currentStock) return Math.max(1, min - item.currentStock);
    return Math.max(1, min || 1);
  };

  const openRequestStockForItem = (item: MedicalInventory) => {
    const masterItemId = item.itemId ?? (item as any).item?.id;
    if (!masterItemId) {
      toast({
        title: 'Missing catalog link',
        description: 'This stock row has no master product id.',
        variant: 'destructive',
      });
      return;
    }
    if (!activeLocation?.id) {
      toast({
        title: 'Location required',
        description: 'Select your working location before requesting stock.',
        variant: 'destructive',
      });
      return;
    }
    setRequisitionPrefill({
      masterItemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      suggestedQty: suggestedReorderQty(item),
    });
    setSelectedFulfillingLocationId(primaryLocation?.id && primaryLocation.id !== activeLocation.id
      ? primaryLocation.id
      : '');
    setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
    setRequisitionNotes(`Reorder: ${item.itemName} (${item.itemCode}) — low/out of stock at ${activeLocation.name || activeLocation.code}`);
    setIsRequestModalOpen(true);
  };

  const openCreatePoForItem = (item: MedicalInventory) => {
    const masterItemId = item.itemId ?? (item as any).item?.id;
    if (!masterItemId) {
      toast({
        title: 'Missing catalog link',
        description: 'This stock row has no master product id.',
        variant: 'destructive',
      });
      return;
    }
    const qty = suggestedReorderQty(item);
    setLocation(`/purchase-orders?create=1&itemId=${encodeURIComponent(masterItemId)}&qty=${qty}`);
  };

  // After supplying location inventory loads, apply prefill from a low-stock row action
  useEffect(() => {
    if (!isRequestModalOpen || !requisitionPrefill || !selectedFulfillingLocationId) return;
    const match = requisitionInventory.find((inv) => {
      const mid = (inv as any).itemId ?? (inv as any).item?.id;
      return mid === requisitionPrefill.masterItemId || inv.itemCode === requisitionPrefill.itemCode;
    });
    if (match) {
      const qty = Math.min(
        Math.max(1, requisitionPrefill.suggestedQty),
        Math.max(0, match.currentStock ?? 0),
      );
      setNewRequisitionItems([
        {
          itemId: match.id,
          requestedQuantity: qty > 0 ? qty : 1,
          unitOfMeasure: match.unitOfMeasure,
        },
      ]);
    } else {
      setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
    }
  }, [isRequestModalOpen, requisitionPrefill, selectedFulfillingLocationId, requisitionInventory]);

  const prefillMissingAtSupplier =
    !!requisitionPrefill &&
    !!selectedFulfillingLocationId &&
    requisitionInventoryFetched &&
    !requisitionInventory.some((inv) => {
      const mid = (inv as any).itemId ?? (inv as any).item?.id;
      return mid === requisitionPrefill.masterItemId || inv.itemCode === requisitionPrefill.itemCode;
    });

  // Filter inventory items based on search
  const filteredInventory = inventory.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const paginatedInventory = filteredInventory.slice(
    (inventoryPage - 1) * PAGE_SIZE,
    inventoryPage * PAGE_SIZE
  );

  useEffect(() => {
    setInventoryPage(1);
  }, [selectedCategory, selectedStatus, selectedLocation, showLowStock, searchTerm, ambulanceInventoryMode]);

  return (
    <div
      className={`space-y-6 bg-uventorybiz-light-gray ${
        ambulanceInventoryMode ? 'px-0 pt-2 pb-6 sm:pb-8' : 'p-4 sm:p-6 pb-20 md:pb-8'
      }`}
    >
      <div className="flex flex-col gap-4 min-[1080px]:flex-row min-[1080px]:justify-between min-[1080px]:items-center min-[1080px]:gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl min-[1080px]:text-3xl font-bold truncate flex items-center gap-2">
            {ambulanceInventoryMode && <Ambulance className="h-8 w-8 shrink-0 text-uventorybiz-navy" aria-hidden />}
            {ambulanceInventoryMode ? 'Vehicle inventory' : 'Inventory'}
          </h1>
          <p className="text-muted-foreground text-sm min-[1080px]:text-base">
            {ambulanceInventoryMode
              ? 'Consumables and equipment on fleet vehicles only. Use stock transfers to move items to or from stores.'
              : 'Stock levels at the current store. Manage the master product list separately.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-[1080px]:justify-end">
          {!ambulanceInventoryMode && (
            <>
              <Button variant="outline" asChild>
                <Link href="/inventory-catalog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Product catalog
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('all')}>
                    Export all
                  </DropdownMenuItem>
                  {inventoryCategories.map(cat => (
                    <DropdownMenuItem key={cat.slug} onClick={() => handleExport(cat.slug)}>
                      Export {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isAdmin && <InventoryCategoriesDialog />}
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportFile}
                aria-label="Import inventory from CSV file"
              />
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => importFileInputRef.current?.click()}
              >
                {isImporting ? (
                  <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Importing...</span>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/templates/products-import.csv" download>
                  Template
                </a>
              </Button>
            </>
          )}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  resetForm();
                  if (ambulanceInventoryMode) {
                    const def =
                      selectedLocation !== 'all'
                        ? selectedLocation
                        : (ambulanceFleet[0] as { id?: string })?.id ?? '';
                    setCreateTargetAmbulanceId(def);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{editingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
              <DialogDescription className="text-sm">
                {editingItem ? 'Update the' : 'Enter the'} details for the inventory item.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Item code */}
                <div className="space-y-2">
                  <Label htmlFor="itemCode">
                    Item Code * 
                    {!editingItem && <span className="text-sm text-gray-500 ml-2">(Auto-generated)</span>}
                  </Label>
                  <Input
                    id="itemCode"
                    value={newItem.itemCode}
                    onChange={(e) => handleInputChange('itemCode', e.target.value)}
                    required
                    disabled={!editingItem}
                    placeholder={!editingItem ? "Will be auto-generated" : ""}
                    data-testid="input-item-code"
                  />
                </div>

                {/* Care location / ambulance unit — multi-site edit, ambulance create, or read-only default */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {ambulanceInventoryMode ? (
                      <>
                        <Ambulance className="h-4 w-4 text-blue-600" />
                        Fleet unit
                      </>
                    ) : (
                      <>
                        <Hospital className="h-4 w-4 text-blue-600" />
                        Store
                      </>
                    )}
                  </Label>

                  {editingItem && (isMultiLocation || ambulanceInventoryMode) ? (
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={ambulanceInventoryMode ? 'Select vehicle' : 'Select location'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(ambulanceInventoryMode ? ambulanceFleet : careLocations).map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center gap-2">
                              {ambulanceInventoryMode ? (
                                <Ambulance className="h-3 w-3 text-blue-600" />
                              ) : (
                                <Hospital className="h-3 w-3 text-blue-600" />
                              )}
                              <span>
                                {loc.locationCode} — {loc.locationName}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : !editingItem && ambulanceInventoryMode ? (
                    <>
                      <Select value={createTargetAmbulanceId} onValueChange={setCreateTargetAmbulanceId}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {(ambulanceFleet as any[]).map((loc: any) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <div className="flex items-center gap-2">
                                <Ambulance className="h-3 w-3 text-blue-600" />
                                <span>
                                  {loc.locationCode} — {loc.locationName}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        New lines are created on the selected fleet unit.
                      </p>
                    </>
                  ) : (
                    (() => {
                      if (isMultiLocation && activeLocation) {
                        return (
                          <>
                            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md opacity-80">
                              <Hospital className="h-4 w-4 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-blue-900">{activeLocation?.code || ''}</p>
                                <p className="text-xs text-blue-700">{activeLocation?.name || ''}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Item will be tagged with your current working location (cannot be changed here).
                            </p>
                          </>
                        );
                      }

                      const primary =
                        (allCareLocations as any[]).find((loc) => loc.isPrimary) || (allCareLocations as any[])[0];
                      if (!primary) {
                        return (
                          <p className="text-xs text-gray-500">
                            No store locations configured yet. Items will not have a location until at least one is created.
                          </p>
                        );
                      }

                      return (
                        <>
                          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md opacity-80">
                            <Hospital className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">{primary.locationCode}</p>
                              <p className="text-xs text-blue-700">{primary.locationName}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Item will be tagged with this default location (cannot be changed here).
                          </p>
                        </>
                      );
                    })()
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={newItem.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryCategories.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Item name */}
                <div className="space-y-2">
                  <Label htmlFor="itemName">{getFieldLabel('itemName')} *</Label>
                  <Input
                    id="itemName"
                    value={newItem.itemName}
                    onChange={(e) => handleInputChange('itemName', e.target.value)}
                    required
                    data-testid="input-item-name"
                  />
                </div>

                {shouldShowField('unitOfMeasure') && (
                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure">{getFieldLabel('unitOfMeasure')} *</Label>
                    <Select value={newItem.unitOfMeasure} onValueChange={(value) => handleInputChange('unitOfMeasure', value)}>
                      <SelectTrigger data-testid="select-unit-measure">
                        <SelectValue placeholder="Select unit of measure" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsOfMeasure.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {shouldShowField('dosageForm') && (
                  <div className="space-y-2">
                    <Label htmlFor="dosageForm">
                      {getFieldLabel('dosageForm')}
                      {currentFields.required.includes('dosageForm') && ' *'}
                    </Label>
                    <Select value={newItem.dosageForm} onValueChange={(value) => handleInputChange('dosageForm', value)}>
                      <SelectTrigger data-testid="select-dosage-form">
                        <SelectValue placeholder="Select dosage form" />
                      </SelectTrigger>
                      <SelectContent>
                        {dosageForms.map(form => (
                          <SelectItem key={form} value={form}>{form}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {shouldShowField('equipmentStatus') && (
                  <div className="space-y-2">
                    <Label htmlFor="equipmentStatus">
                      {getFieldLabel('equipmentStatus')}
                      {currentFields.required.includes('equipmentStatus') && ' *'}
                    </Label>
                    <Select value={newItem.equipmentStatus} onValueChange={(value) => handleInputChange('equipmentStatus', value)}>
                      <SelectTrigger data-testid="select-equipment-status">
                        <SelectValue placeholder="Select equipment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentStatuses.map(status => (
                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Current Stock *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    value={newItem.currentStock}
                    onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                    required
                    data-testid="input-current-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Minimum Stock *</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    value={newItem.minimumStock}
                    onChange={(e) => handleInputChange('minimumStock', parseInt(e.target.value) || 0)}
                    required
                    data-testid="input-minimum-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maximumStock">Maximum Stock</Label>
                  <Input
                    id="maximumStock"
                    type="number"
                    value={newItem.maximumStock}
                    onChange={(e) => handleInputChange('maximumStock', parseInt(e.target.value) || 0)}
                    data-testid="input-maximum-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={newItem.unitCost}
                    onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                    data-testid="input-unit-cost"
                  />
                </div>
                {shouldShowField('supplier') && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier">
                      {getFieldLabel('supplier')}
                      {currentFields.required.includes('supplier') && ' *'}
                    </Label>
                    <Input
                      id="supplier"
                      value={newItem.supplier}
                      onChange={(e) => handleInputChange('supplier', e.target.value)}
                      required={currentFields.required.includes('supplier')}
                      data-testid="input-supplier"
                    />
                  </div>
                )}

                {shouldShowField('expiryDate') && (
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">
                      {getFieldLabel('expiryDate')}
                      {currentFields.required.includes('expiryDate') && ' *'}
                    </Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={newItem.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                      required={currentFields.required.includes('expiryDate')}
                      data-testid="input-expiry-date"
                    />
                  </div>
                )}

                {shouldShowField('batchNumber') && (
                  <div className="space-y-2">
                    <Label htmlFor="batchNumber">
                      {getFieldLabel('batchNumber')}
                      {currentFields.required.includes('batchNumber') && ' *'}
                    </Label>
                    <Input
                      id="batchNumber"
                      value={newItem.batchNumber}
                      onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                      required={currentFields.required.includes('batchNumber')}
                      data-testid="input-batch-number"
                    />
                  </div>
                )}

                {shouldShowField('lotNumber') && (
                  <div className="space-y-2">
                    <Label htmlFor="lotNumber">{getFieldLabel('lotNumber')}</Label>
                    <Input
                      id="lotNumber"
                      value={newItem.lotNumber}
                      onChange={(e) => handleInputChange('lotNumber', e.target.value)}
                      data-testid="input-lot-number"
                    />
                  </div>
                )}

                {shouldShowField('serialNumber') && (
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">{getFieldLabel('serialNumber')}</Label>
                    <Input
                      id="serialNumber"
                      value={newItem.serialNumber}
                      onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      data-testid="input-serial-number"
                    />
                  </div>
                )}

                {shouldShowField('lastMaintenanceDate') && (
                  <div className="space-y-2">
                    <Label htmlFor="lastMaintenanceDate">{getFieldLabel('lastMaintenanceDate')}</Label>
                    <Input
                      id="lastMaintenanceDate"
                      type="date"
                      value={newItem.lastMaintenanceDate}
                      onChange={(e) => handleInputChange('lastMaintenanceDate', e.target.value)}
                      data-testid="input-last-maintenance-date"
                    />
                  </div>
                )}

                {shouldShowField('nextMaintenanceDate') && (
                  <div className="space-y-2">
                    <Label htmlFor="nextMaintenanceDate">{getFieldLabel('nextMaintenanceDate')}</Label>
                    <Input
                      id="nextMaintenanceDate"
                      type="date"
                      value={newItem.nextMaintenanceDate}
                      onChange={(e) => handleInputChange('nextMaintenanceDate', e.target.value)}
                      data-testid="input-next-maintenance-date"
                    />
                  </div>
                )}

                {shouldShowField('warrantyExpiry') && (
                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">{getFieldLabel('warrantyExpiry')}</Label>
                    <Input
                      id="warrantyExpiry"
                      type="date"
                      value={newItem.warrantyExpiry}
                      onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)}
                      data-testid="input-warranty-expiry"
                    />
                  </div>
                )}
              </div>
              {shouldShowField('description') && (
                <div className="space-y-2">
                  <Label htmlFor="description">{getFieldLabel('description')}</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Additional details about the item"
                    data-testid="textarea-description"
                  />
                </div>
              )}
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="item-image">Item Image (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-gray-400 transition-colors">
                  <label 
                    htmlFor="item-image-upload" 
                    className="block p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {uploadedImageUrl || (editingItem as any)?.imageUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={uploadedImageUrl || (editingItem as any)?.imageUrl} 
                          alt="Item preview" 
                          className="max-h-32 mx-auto rounded"
                        />
                        <p className="text-xs text-gray-500">Click to change image</p>
                      </div>
                    ) : (
                      <>
                        <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 font-medium">
                          Click to upload item image
                        </p>
                        <p className="text-xs text-gray-500">
                          Max 5MB • Images only
                        </p>
                      </>
                    )}
                    <Input
                      id="item-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {isUploadingImage && (
                    <div className="px-4 pb-4 flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <p className="text-sm text-blue-600 font-medium">Uploading image...</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                  className="w-full sm:w-auto"
                >
                  {editingItem ? 'Update' : 'Create'} Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          {!ambulanceInventoryMode &&
            isMultiLocation &&
            activeLocation &&
            primaryLocation &&
            activeLocation.id !== primaryLocation.id && (
            <Button
              variant="outline"
              onClick={() => {
                setRequisitionPrefill(null);
                setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
                setRequisitionNotes('');
                setSelectedFulfillingLocationId(primaryLocation?.id ?? '');
                setIsRequestModalOpen(true);
              }}
              data-testid="button-request-stock"
            >
              Request from Central
            </Button>
          )}
        </div>
      </div>

      {importResult != null && (
        <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
          <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Import result</DialogTitle>
              <DialogDescription>
                {importResult.created} of {importResult.total} rows imported successfully.
                {importResult.errors?.length ? ` ${importResult.errors.length} row(s) had errors.` : ''}
              </DialogDescription>
            </DialogHeader>
            {importResult.errors?.length ? (
              <div className="max-h-40 overflow-y-auto text-sm">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-destructive">Row {err.row}: {err.error}</div>
                ))}
              </div>
            ) : null}
            <DialogFooter>
              <Button onClick={() => setImportResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {inventory.filter(item => item.currentStock <= item.minimumStock).length}
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(inventory.map(item => item.category)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
            <CardTitle className="text-sm font-medium truncate">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold break-all">
              {formatCurrency(inventory.reduce((sum, item) => sum + (item.unitCost || 0) * item.currentStock, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {inventoryCategories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]" data-testid="filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            {((isMultiLocation && allCareLocations.length > 0) ||
              (ambulanceInventoryMode && (ambulanceFleet as any[]).length > 0)) && (
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[180px]" data-testid="filter-location">
                  <SelectValue placeholder={ambulanceInventoryMode ? 'All vehicles' : 'All Locations'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {ambulanceInventoryMode ? 'All vehicles' : 'All Locations'}
                  </SelectItem>
                  {(ambulanceInventoryMode ? ambulanceFleet : allCareLocations).map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <div className="flex items-center gap-2">
                        {ambulanceInventoryMode ? (
                          <Ambulance className="h-3 w-3" />
                        ) : (
                          <Hospital className="h-3 w-3" />
                        )}
                        <span>{loc.locationCode}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              data-testid="button-low-stock-filter"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="flex justify-between">
          <div>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>
              {ambulanceInventoryMode
                ? 'Stock held on fleet vehicle locations only'
                : 'Manage your product inventory and equipment stock levels'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading inventory...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory items found
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInventory.map((item, index) => {
                  const stockStatus = getStockStatus(item);
                  // Check for issues that should highlight the row
                  const hasLowStock = item.currentStock <= item.minimumStock;
                  const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                  const isFaulty = item.equipmentStatus === 'faulty';
                  const isMaintenance = item.equipmentStatus === 'maintenance';
                  const hasIssue = hasLowStock || isExpiring || isExpired || isFaulty || isMaintenance;
                  const rowIndex = (inventoryPage - 1) * PAGE_SIZE + index;
                  // Determine row background color
                  let rowBgClass = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50";
                  if (hasIssue) {
                    if (isFaulty || isExpired) {
                      rowBgClass = "bg-red-50 hover:bg-red-100";
                    } else if (isMaintenance) {
                      rowBgClass = "bg-yellow-50 hover:bg-yellow-100";
                    } else if (hasLowStock || isExpiring) {
                      rowBgClass = "bg-orange-50 hover:bg-orange-100";
                    }
                  }

                  // Check next maintenance date status
                  const getNextMaintenanceStatus = () => {
                    if (!item.nextMaintenanceDate) return null;
                    const maintenanceDate = new Date(item.nextMaintenanceDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    maintenanceDate.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntil < 0) {
                      const daysOver = Math.abs(daysUntil);
                      return { color: 'text-red-600 font-semibold', label: `${daysOver} days Over` };
                    }
                    if (daysUntil <= 7) return { color: 'text-orange-600 font-semibold', label: `${daysUntil} days` };
                    if (daysUntil <= 30) return { color: 'text-yellow-600 font-medium', label: `${daysUntil} days` };
                    return null;
                  };
                  const nextMaintenanceStatus = getNextMaintenanceStatus();
                  
                  return (
                    <TableRow key={item.id} className={rowBgClass} data-testid={`row-inventory-${item.id}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {rowIndex + 1}
                      </TableCell>
                      <TableCell>
                        {(item as any).imageUrl ? (
                          <img 
                            src={(item as any).imageUrl} 
                            alt={item.itemName}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.itemCode}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{getCategoryLabel(item.category, inventoryCategories)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.currentStock} {item.unitOfMeasure}
                          <Badge variant={stockStatus.variant} className="text-xs">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{item.minimumStock} {item.unitOfMeasure}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof item.location === 'object' && item.location ? (
                          <div className="flex items-center gap-1 min-w-0">
                            {ambulanceInventoryMode ? (
                              <Ambulance className="h-3 w-3 shrink-0 text-blue-600" />
                            ) : (
                              <Hospital className="h-3 w-3 shrink-0 text-blue-600" />
                            )}
                            <span className="text-xs truncate" title={item.location.locationName}>
                              {ambulanceInventoryMode
                                ? `${item.location.locationCode} – ${item.location.locationName}`
                                : item.location.locationCode}
                            </span>
                          </div>
                        ) : typeof item.location === 'string' ? (
                          <span className="text-xs text-gray-600">{item.location}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {stockStatus.needsReorder && !ambulanceInventoryMode && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                  title="Reorder actions"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isMultiLocation && (
                                  <DropdownMenuItem onClick={() => openRequestStockForItem(item)}>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Request stock
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openCreatePoForItem(item)}>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Create purchase order
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(inventoryPage - 1) * PAGE_SIZE + 1}–{Math.min(inventoryPage * PAGE_SIZE, filteredInventory.length)} of {filteredInventory.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                    disabled={inventoryPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {inventoryPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInventoryPage((p) => Math.min(totalPages, p + 1))}
                    disabled={inventoryPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Stock Requisition Modal */}
      <Dialog
        open={isRequestModalOpen}
        onOpenChange={(open) => {
          setIsRequestModalOpen(open);
          if (open) {
            if (!selectedFulfillingLocationId) {
              setSelectedFulfillingLocationId(
                primaryLocation?.id && primaryLocation.id !== activeLocation?.id
                  ? primaryLocation.id
                  : '',
              );
            }
          } else {
            setRequisitionPrefill(null);
            setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
            setRequisitionNotes('');
            setSelectedFulfillingLocationId('');
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Request stock</DialogTitle>
            <DialogDescription className="text-sm">
              {requisitionPrefill
                ? `Prefilled for ${requisitionPrefill.itemName} (${requisitionPrefill.itemCode}). Choose a supplying store that has this product in stock.`
                : 'Request stock for your location from the central warehouse or another store.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {prefillMissingAtSupplier && requisitionPrefill && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p>
                  <strong>{requisitionPrefill.itemName}</strong> isn’t stocked at the selected supplying store.
                  Pick another location, or{' '}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setLocation(
                        `/purchase-orders?create=1&itemId=${encodeURIComponent(requisitionPrefill.masterItemId)}&qty=${requisitionPrefill.suggestedQty}`,
                      );
                    }}
                  >
                    create a purchase order
                  </button>{' '}
                  instead.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center text-sm">
              <span className="text-muted-foreground">From (your location):</span>
              <span className="font-medium">
                {activeLocation ? `${activeLocation.code} – ${activeLocation.name}` : 'No active location selected.'}
              </span>
              <span className="text-muted-foreground hidden sm:inline">→</span>
              <span className="text-muted-foreground">To (supplying location):</span>
              <Select
                value={selectedFulfillingLocationId}
                onValueChange={(value) => {
                  setSelectedFulfillingLocationId(value);
                  if (!requisitionPrefill) {
                    setNewRequisitionItems([{ itemId: '', requestedQuantity: 0 }]);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select supplying location" />
                </SelectTrigger>
                <SelectContent>
                  {(allCareLocations as any[]).filter((loc: any) => loc.id !== activeLocation?.id).map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.isPrimary ? `${loc.locationCode || loc.code} – ${loc.locationName || loc.name} (Central store)` : `${loc.locationCode || loc.code} – ${loc.locationName || loc.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {newRequisitionItems.map((row, index) => {
                const supplyingItem = requisitionInventory.find((inv) => inv.id === row.itemId);
                const maxQty = supplyingItem?.currentStock;
                const requestingItem = supplyingItem
                  ? requestingLocationInventory.find((inv) => inv.itemCode === supplyingItem.itemCode)
                  : undefined;
                const supplyingLocationName =
                  (allCareLocations as any[])?.find((l: any) => l.id === selectedFulfillingLocationId)?.locationName ||
                  (allCareLocations as any[])?.find((l: any) => l.id === selectedFulfillingLocationId)?.locationCode ||
                  'Supplying store';
                return (
                  <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="w-full sm:flex-1 min-w-0">
                      <Label className="text-xs">Item</Label>
                      <Select
                        value={row.itemId}
                        onValueChange={(value) => updateRequisitionItemRow(index, 'itemId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedFulfillingLocationId ? "Select item" : "Select supplying location first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {requisitionInventory.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.itemName} ({item.itemCode}) — {item.currentStock} {item.unitOfMeasure}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {supplyingItem && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Available at {supplyingLocationName}: <span className="font-medium text-foreground">{supplyingItem.currentStock ?? 0} {supplyingItem.unitOfMeasure}</span></span>
                          <span>Current at your store: <span className="font-medium text-foreground">{requestingItem != null ? `${requestingItem.currentStock ?? 0} ${requestingItem.unitOfMeasure}` : '—'}</span></span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0 sm:w-32 sm:flex-none">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.requestedQuantity}
                          onChange={(e) => {
                            const raw = Number(e.target.value) || 0;
                            const clamped = typeof maxQty === 'number' ? Math.min(raw, maxQty) : raw;
                            updateRequisitionItemRow(index, 'requestedQuantity', clamped);
                          }}
                          disabled={!row.itemId || typeof maxQty !== 'number'}
                        />
                        {typeof maxQty === 'number' && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Max available: {maxQty}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-10 w-10 sm:mt-5"
                        onClick={() => removeRequisitionItemRow(index)}
                        disabled={newRequisitionItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addRequisitionItemRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Reason for request, urgency, etc."
                value={requisitionNotes}
                onChange={(e) => setRequisitionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsRequestModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequisition}
              disabled={createRequisitionMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createRequisitionMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!ambulanceInventoryMode && <MobileNav />}
    </div>
  );
}