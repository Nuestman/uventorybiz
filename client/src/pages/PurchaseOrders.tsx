import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Search, Package, Edit, Trash2, Eye, DollarSign, Truck, CheckCircle, Clock, MoreHorizontal, Undo2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useActiveLocation } from '@/hooks/useActiveLocation';
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
};

const PO_UNITS_OF_MEASURE = [
  'pieces', 'boxes', 'packs', 'sets', 'kits', 'units', 'pairs',
  'liters', 'milliliters', 'grams', 'kilograms', 'meters', 'rolls', 'sheets', 'tubes'
];

const PO_DOSAGE_FORMS = [
  'tablets', 'capsules', 'vials', 'ampoules', 'syringes', 'injections',
  'drops', 'creams', 'ointments', 'patches', 'solutions', 'suspensions'
];

const PO_EQUIPMENT_STATUSES = [
  { value: 'functional', label: 'Functional' },
  { value: 'faulty', label: 'Faulty' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' }
];

function generateItemCode(
  categorySlug: string,
  itemName: string,
  categories: InventoryCategoryOption[],
): string {
  if (!categorySlug || !itemName.trim()) return '';
  const prefix = categories.find(c => c.slug === categorySlug)?.itemCodePrefix || 'ITM';
  const namePart = itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'XXX';
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${namePart}${timestamp}`;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier?: string;
  supplierId?: string;
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  actualDeliveryDate?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'shipped' | 'partially_received' | 'completed' | 'cancelled';
  totalAmount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrderItem {
  id: string;
  poId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
  totalCost: string;
  notes?: string;
}

interface NewPurchaseOrder {
  supplierId: string;
  expectedDelivery?: string;
  notes?: string;
  items: Array<{
    itemId: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
}

// Same shape as Inventory add-item form (master-only: locationId + currentStock:0 at PO create)
interface NewItemFormState {
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
  status: string;
  equipmentStatus?: string;
  expiryDate?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
}

export default function PurchaseOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenantSettings();
  const { isMultiLocation, activeLocation } = useActiveLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPOItems] = useState<PurchaseOrderItem[]>([]);
  const [receiveLocationId, setReceiveLocationId] = useState('');
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [reverseLocationId, setReverseLocationId] = useState('');
  const [reverseQuantities, setReverseQuantities] = useState<Record<string, number>>({});
  const [reverseNotes, setReverseNotes] = useState('');
  const [newPO, setNewPO] = useState<NewPurchaseOrder>({
    supplierId: '',
    expectedDelivery: '',
    notes: '',
    items: []
  });
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [editForm, setEditForm] = useState<{ supplierId: string; expectedDelivery: string; notes: string }>({ supplierId: '', expectedDelivery: '', notes: '' });
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemRowIndex, setNewItemRowIndex] = useState<number | null>(null);
  const [isNewSupplierDialogOpen, setIsNewSupplierDialogOpen] = useState(false);
  const [newSupplierTarget, setNewSupplierTarget] = useState<'create' | 'edit'>('create');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [newItem, setNewItem] = useState<NewItemFormState>({
    itemCode: '',
    itemName: '',
    description: '',
    category: 'consumables',
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    unitOfMeasure: 'units',
    dosageForm: '',
    unitCost: 0,
    supplier: '',
    status: 'active',
    equipmentStatus: 'functional',
    expiryDate: '',
    batchNumber: '',
    lotNumber: '',
    serialNumber: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    warrantyExpiry: ''
  });

  const { data: inventoryCategories = [] } = useQuery({
    queryKey: ['/api/inventory-categories'],
    queryFn: async () => {
      const res = await fetch('/api/inventory-categories', { credentials: 'include' });
      if (!res.ok) return [];
      return (await res.json()) as InventoryCategoryOption[];
    },
  });

  const getFieldTemplate = (categorySlug: string): InventoryFieldTemplate => {
    const tpl = inventoryCategories.find((c) => c.slug === categorySlug)?.fieldTemplate;
    if (tpl === 'medication' || tpl === 'supplies' || tpl === 'equipment' || tpl === 'consumables') {
      return tpl;
    }
    return 'supplies';
  };

  // Fetch purchase orders
  const { data: purchaseOrdersRaw, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders');
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });
  const purchaseOrders = Array.isArray(purchaseOrdersRaw) ? purchaseOrdersRaw : [];

  // Fetch suppliers for PO creation (dropdown)
  const { data: suppliers = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    }
  });

  // Receive destinations: fixed stores and fleet units (mobile collect from supplier).
  const { data: storeLocations = [] } = useQuery<
    Array<{
      id: string;
      locationName: string;
      locationCode: string;
      isPrimary?: boolean;
      status?: string;
      locationKind?: string;
    }>
  >({
    queryKey: ['/api/care-locations', { includeInactive: false }],
    queryFn: async () => {
      const res = await fetch('/api/care-locations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch locations');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const activeStores = useMemo(
    () => storeLocations.filter((loc) => !loc.status || loc.status === 'active'),
    [storeLocations]
  );

  const defaultReceiveLocationId = useMemo(() => {
    if (activeLocation?.id && activeStores.some((s) => s.id === activeLocation.id)) {
      return activeLocation.id;
    }
    const primary = activeStores.find((s) => s.isPrimary);
    return primary?.id ?? activeStores[0]?.id ?? '';
  }, [activeLocation?.id, activeStores]);

  const effectiveReverseLocationId = reverseLocationId || defaultReceiveLocationId;

  const { data: reverseLocationStock = [] } = useQuery<
    Array<{ itemId?: string; item?: { id: string }; id: string; currentStock: number; itemCode?: string }>
  >({
    queryKey: ['/api/inventory', 'po-reverse', effectiveReverseLocationId],
    queryFn: async () => {
      if (!effectiveReverseLocationId) return [];
      const res = await fetch(
        `/api/inventory?locationId=${encodeURIComponent(effectiveReverseLocationId)}`,
        { credentials: 'include' }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isReverseModalOpen && !!effectiveReverseLocationId,
  });

  const stockAtReverseLocation = (masterItemId: string) => {
    const row = reverseLocationStock.find((inv) => {
      const mid = inv.itemId ?? inv.item?.id;
      return mid === masterItemId;
    });
    return row?.currentStock ?? 0;
  };

  // Master catalog for PO lines (not location stock — you can order items with no stock yet)
  const { data: catalogItemsRaw } = useQuery({
    queryKey: ['/api/inventory-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/inventory-catalog', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch product catalog');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });
  const catalogItems = Array.isArray(catalogItemsRaw) ? catalogItemsRaw : [];
  const selectableCatalogItems = useMemo(
    () =>
      (catalogItems as Array<{ id: string; itemName: string; itemCode: string; status?: string }>).filter(
        (i) => i.status !== 'discontinued' && i.status !== 'inactive'
      ),
    [catalogItems]
  );

  // Deep-link from Inventory low-stock actions: /purchase-orders?create=1&itemId=…&qty=…
  useEffect(() => {
    if (prefillApplied) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') !== '1') return;
    const itemId = params.get('itemId')?.trim() || '';
    const qtyRaw = parseInt(params.get('qty') || '1', 10);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    setIsCreateModalOpen(true);
    if (itemId) {
      setNewPO((prev) => ({
        ...prev,
        items: [{ itemId, quantityOrdered: qty, unitCost: 0 }],
        notes: prev.notes || 'Created from low/out-of-stock inventory action',
      }));
    }
    setPrefillApplied(true);
    window.history.replaceState({}, '', '/purchase-orders');
  }, [prefillApplied]);

  const resetNewItemForm = () => {
    setNewItem({
      itemCode: '',
      itemName: '',
      description: '',
      category: 'consumables',
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      unitOfMeasure: 'units',
      dosageForm: '',
      unitCost: 0,
      supplier: '',
      status: 'active',
      equipmentStatus: 'functional',
      expiryDate: '',
      batchNumber: '',
      lotNumber: '',
      serialNumber: '',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      warrantyExpiry: ''
    });
    setNewItemRowIndex(null);
  };

  const getFieldsForCategory = (category: string) =>
    INVENTORY_CATEGORY_FIELD_CONFIG[getFieldTemplate(category)] || {
      required: ['itemName', 'category', 'unitOfMeasure'],
      optional: ['description', 'supplier', 'expiryDate', 'batchNumber'],
      labels: {},
    };
  const shouldShowField = (fieldName: string, category: string) => {
    if (!category) return true;
    const fields = getFieldsForCategory(category);
    return fields.required.includes(fieldName) || fields.optional.includes(fieldName);
  };
  const getFieldLabel = (fieldName: string, category: string) => {
    const fields = getFieldsForCategory(category);
    return fields.labels[fieldName] || (fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'));
  };

  const handleNewItemInputChange = (field: keyof NewItemFormState, value: any) => {
    const updated = { ...newItem, [field]: value };
    if (field === 'category' || field === 'itemName') {
      updated.itemCode = generateItemCode(
        field === 'category' ? value : updated.category,
        field === 'itemName' ? value : updated.itemName,
        inventoryCategories,
      );
    }
    setNewItem(updated);
  };

  // Create catalog product only (no stock row). Receive on the PO later creates/updates stock at the receive store.
  const createNewItemMutation = useMutation({
    mutationFn: async (payload: { form: NewItemFormState; rowIndex: number | null }) => {
      const form = payload.form;
      const code = (form.itemCode || '').trim() || generateItemCode(form.category, form.itemName, inventoryCategories);
      const cleanedData: Record<string, unknown> = {
        itemCode: code,
        itemName: (form.itemName || '').trim(),
        category: form.category,
        unitOfMeasure: (form.unitOfMeasure || 'units').trim(),
        dosageForm: form.dosageForm || undefined,
        status: form.status || 'active',
        equipmentStatus: form.equipmentStatus || undefined,
      };
      const res = await fetch('/api/inventory-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cleanedData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const fieldErrors = err.errors && typeof err.errors === 'object'
          ? Object.entries(err.errors as Record<string, string[]>)
              .flatMap(([f, msgs]) => (Array.isArray(msgs) ? msgs.map((m) => `${f}: ${m}`) : [`${f}`]))
              .join('; ')
          : '';
        throw new Error(fieldErrors || err.message || 'Failed to create item');
      }
      return res.json().then((data: any) => ({ data, rowIndex: payload.rowIndex }));
    },
    onSuccess: ({ data, rowIndex }: { data: any; rowIndex: number | null }) => {
      const masterItemId = data.id;
      if (masterItemId != null) {
        if (rowIndex != null && rowIndex >= 0) {
          updatePOItem(rowIndex, 'itemId', masterItemId);
        } else {
          setNewPO((prev) => ({ ...prev, items: [...prev.items, { itemId: masterItemId, quantityOrdered: 1, unitCost: 0 }] }));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-catalog'] });
      setIsNewItemDialogOpen(false);
      resetNewItemForm();
      toast({ title: 'Item created', description: 'Added to product catalog and to this PO.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const resetNewSupplierForm = () => {
    setNewSupplier({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const openNewSupplierDialog = (target: 'create' | 'edit') => {
    setNewSupplierTarget(target);
    resetNewSupplierForm();
    setIsNewSupplierDialogOpen(true);
  };

  const createNewSupplierMutation = useMutation({
    mutationFn: async (form: typeof newSupplier) => {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          contactName: form.contactName.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create supplier');
      }
      return res.json() as Promise<{ id: string; name: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      if (newSupplierTarget === 'edit') {
        setEditForm((prev) => ({ ...prev, supplierId: data.id }));
      } else {
        setNewPO((prev) => ({ ...prev, supplierId: data.id }));
      }
      setIsNewSupplierDialogOpen(false);
      resetNewSupplierForm();
      toast({ title: 'Supplier created', description: `${data.name} added and selected on this PO.` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create purchase order mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: NewPurchaseOrder) => {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create purchase order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive"
      });
    }
  });

  // Update PO status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update purchase order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Success",
        description: "Purchase order status updated"
      });
    }
  });

  // Receive items mutation (auto-adjusts stock at chosen store)
  const receiveItemsMutation = useMutation({
    mutationFn: async ({
      poId,
      items,
      locationId,
    }: {
      poId: string;
      items: Array<{ itemId: string; quantityReceived: number }>;
      locationId: string;
    }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items, locationId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to receive items');
      }
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      const store = activeStores.find((s) => s.id === vars.locationId);
      toast({
        title: 'Success',
        description: store
          ? `Items received into ${store.locationCode} – ${store.locationName}`
          : 'Items received and stock updated',
      });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reverseReceiveMutation = useMutation({
    mutationFn: async ({
      poId,
      locationId,
      items,
      notes,
    }: {
      poId: string;
      locationId: string;
      items: Array<{ itemId: string; quantityReversed: number }>;
      notes?: string;
    }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/reverse-receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ locationId, items, notes: notes || undefined }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reverse receipt');
      }
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      const store = activeStores.find((s) => s.id === vars.locationId);
      toast({
        title: 'Receipt reversed',
        description: store
          ? `Stock removed from ${store.locationCode} – ${store.locationName}`
          : 'Received quantities reversed and stock updated',
      });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update purchase order mutation
  const updatePOMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) => {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update purchase order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setIsEditModalOpen(false);
      setIsStatusModalOpen(false);
      toast({
        title: "Success",
        description: "Purchase order updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete purchase order mutation
  const deletePOMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete purchase order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
    }
  });

  const resetForm = () => {
    setNewPO({
      supplierId: '',
      expectedDelivery: '',
      notes: '',
      items: []
    });
  };

  const addItemToPO = () => {
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { itemId: '', quantityOrdered: 0, unitCost: 0 }]
    }));
  };

  const removeItemFromPO = (index: number) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    // Fetch PO items
    try {
      const response = await fetch(`/api/purchase-orders/${po.id}/items`);
      const items = await response.json();
      setPOItems(items);
      setIsViewModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive"
      });
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setEditForm({
      supplierId: po.supplierId ?? '',
      expectedDelivery: po.expectedDelivery ? new Date(po.expectedDelivery).toISOString().slice(0, 10) : '',
      notes: po.notes ?? ''
    });
    setIsEditModalOpen(true);
  };

  const handleStatusChange = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsStatusModalOpen(true);
  };

  const handleDeletePO = (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      deletePOMutation.mutate(id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'ordered': return <Truck className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'partially_received': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_approval': return 'default';
      case 'approved': return 'default';
      case 'ordered': return 'default';
      case 'shipped': return 'secondary';
      case 'partially_received': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleOpenReceive = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReceiveQuantities({});
    setReceiveLocationId(defaultReceiveLocationId);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/items`);
      const items = await res.json();
      setPOItems(items);
      setIsReceiveModalOpen(true);
    } catch {
      toast({ title: "Error", description: "Failed to load PO items", variant: "destructive" });
    }
  };

  const handleOpenReverse = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReverseQuantities({});
    setReverseNotes('');
    setReverseLocationId(defaultReceiveLocationId);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/items`);
      const items = await res.json();
      setPOItems(Array.isArray(items) ? items : []);
      setIsReverseModalOpen(true);
    } catch {
      toast({ title: 'Error', description: 'Failed to load PO items', variant: 'destructive' });
    }
  };

  const handleReceiveSubmit = () => {
    if (!selectedPO) return;
    const locationId = receiveLocationId || defaultReceiveLocationId;
    if (!locationId) {
      toast({
        title: 'Store required',
        description: 'Choose which store to receive this stock into.',
        variant: 'destructive',
      });
      return;
    }
    const items = poItems
      .map((line) => ({ itemId: line.itemId, quantityReceived: receiveQuantities[line.id] ?? 0 }))
      .filter((x) => x.quantityReceived > 0);
    if (items.length === 0) {
      toast({ title: "No quantities", description: "Enter at least one quantity to receive", variant: "destructive" });
      return;
    }
    receiveItemsMutation.mutate(
      { poId: selectedPO.id, items, locationId },
      {
        onSuccess: () => {
          setIsReceiveModalOpen(false);
          setSelectedPO(null);
          setReceiveQuantities({});
          setReceiveLocationId('');
        }
      }
    );
  };

  const handleReverseSubmit = () => {
    if (!selectedPO) return;
    const locationId = reverseLocationId || defaultReceiveLocationId;
    if (!locationId) {
      toast({
        title: 'Store required',
        description: 'Choose which store to reverse stock from.',
        variant: 'destructive',
      });
      return;
    }
    const items = poItems
      .map((line) => ({
        itemId: line.itemId,
        quantityReversed: reverseQuantities[line.id] ?? 0,
      }))
      .filter((x) => x.quantityReversed > 0);
    if (items.length === 0) {
      toast({
        title: 'No quantities',
        description: 'Enter at least one quantity to reverse',
        variant: 'destructive',
      });
      return;
    }
    reverseReceiveMutation.mutate(
      {
        poId: selectedPO.id,
        locationId,
        items,
        notes: reverseNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsReverseModalOpen(false);
          setSelectedPO(null);
          setReverseQuantities({});
          setReverseLocationId('');
          setReverseNotes('');
        },
      }
    );
  };

  const getItemName = (itemId: string) =>
    (catalogItems as Array<{ id: string; itemName: string }>).find((i) => i.id === itemId)?.itemName ?? itemId;
  const getItemCode = (itemId: string) =>
    (catalogItems as Array<{ id: string; itemCode: string }>).find((i) => i.id === itemId)?.itemCode ?? '';

  const filteredPOs = purchaseOrders.filter(po => {
    const supplierName = (po.supplier ?? '').toLowerCase();
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || supplierName.includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPO.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the purchase order",
        variant: "destructive"
      });
      return;
    }
    createPOMutation.mutate(newPO);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Order from the product catalog; receive into a store to update stock
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-po">
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {purchaseOrders.filter(po => ['pending_approval', 'approved', 'ordered', 'shipped', 'partially_received'].includes(po.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {purchaseOrders.filter(po => po.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(purchaseOrders.reduce((sum, po) => sum + parseFloat(po.totalAmount || '0'), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Awaiting supplier confirmation</SelectItem>
            <SelectItem value="ordered">Confirmed by supplier</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="partially_received">Partially Received</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Track inventory procurement and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading purchase orders...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po, index) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono">{po.poNumber}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>
                      {new Date(po.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {po.expectedDelivery ? 
                        new Date(po.expectedDelivery).toLocaleDateString() : 
                        'Not specified'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(po.status) as any} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(po.status)}
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(po.totalAmount || '0'))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${po.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewPO(po)} data-testid={`button-view-${po.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPO(po)} data-testid={`button-edit-${po.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(po)} data-testid={`button-status-${po.id}`}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Change Status
                          </DropdownMenuItem>
                          {['shipped', 'partially_received'].includes(po.status) && (
                            <DropdownMenuItem onClick={() => handleOpenReceive(po)} data-testid={`button-receive-${po.id}`}>
                              <Package className="mr-2 h-4 w-4" />
                              Receive Goods
                            </DropdownMenuItem>
                          )}
                          {['partially_received', 'completed'].includes(po.status) && (
                            <DropdownMenuItem onClick={() => handleOpenReverse(po)} data-testid={`button-reverse-${po.id}`}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              Reverse receipt
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeletePO(po.id)}
                            className="text-red-600"
                            data-testid={`button-delete-${po.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPOs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No purchase orders found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PO Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order and automatically update inventory upon delivery
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => openNewSupplierDialog('create')}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create new supplier
                  </Button>
                </div>
                <Select value={newPO.supplierId || undefined} onValueChange={(v) => setNewPO(prev => ({ ...prev, supplierId: v }))} required>
                  <SelectTrigger data-testid="input-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={newPO.expectedDelivery}
                  onChange={(e) => setNewPO(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                  data-testid="input-expected-delivery"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newPO.notes}
                onChange={(e) => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this purchase order..."
                data-testid="textarea-notes"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-base font-medium">Items</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addItemToPO}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewItemRowIndex(null);
                      resetNewItemForm();
                      setIsNewItemDialogOpen(true);
                    }}
                  >
                    Create new item
                  </Button>
                </div>
              </div>
              
              {newPO.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-3 border rounded">
                  <div className="space-y-2">
                    <Label>Item *</Label>
                    <Select
                      value={item.itemId || undefined}
                      onValueChange={(value) => updatePOItem(index, 'itemId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableCatalogItems.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.itemName} ({inv.itemCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantityOrdered}
                      onChange={(e) => updatePOItem(index, 'quantityOrdered', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Cost *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updatePOItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItemFromPO(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {newPO.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded">
                  No items added yet. Click "Add Item" to start building your purchase order.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPOMutation.isPending}
                data-testid="button-submit-po"
                style={{
                  backgroundColor: 'var(--uventorybiz-navy)',
                  color: 'white'
                }}
                className="hover:opacity-90"
              >
                {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create new supplier (for PO header) */}
      <Dialog
        open={isNewSupplierDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetNewSupplierForm();
          setIsNewSupplierDialogOpen(open);
        }}
      >
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>
              Creates a supplier and selects it on this purchase order.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSupplier.name.trim()) return;
              createNewSupplierMutation.mutate(newSupplier);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="po-new-supplier-name">Name *</Label>
              <Input
                id="po-new-supplier-name"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier((p) => ({ ...p, name: e.target.value }))}
                placeholder="Supplier name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-new-supplier-contact">Contact name</Label>
              <Input
                id="po-new-supplier-contact"
                value={newSupplier.contactName}
                onChange={(e) => setNewSupplier((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="Contact person"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="po-new-supplier-email">Email</Label>
                <Input
                  id="po-new-supplier-email"
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier((p) => ({ ...p, email: e.target.value }))}
                  placeholder="orders@supplier.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-new-supplier-phone">Phone</Label>
                <Input
                  id="po-new-supplier-phone"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-new-supplier-address">Address</Label>
              <Textarea
                id="po-new-supplier-address"
                rows={2}
                value={newSupplier.address}
                onChange={(e) => setNewSupplier((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-new-supplier-notes">Notes</Label>
              <Textarea
                id="po-new-supplier-notes"
                rows={2}
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewSupplierDialogOpen(false);
                  resetNewSupplierForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newSupplier.name.trim() || createNewSupplierMutation.isPending}
                style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }}
                className="hover:opacity-90"
              >
                {createNewSupplierMutation.isPending ? 'Creating…' : 'Create supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create new master item (for PO line) */}
      <Dialog open={isNewItemDialogOpen} onOpenChange={(open) => { if (!open) resetNewItemForm(); setIsNewItemDialogOpen(open); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add product to catalog</DialogTitle>
            <DialogDescription>
              Adds a catalog product only (no stock yet). Quantity, batch, lot, and expiry are set when you receive the PO into a store.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newItem.itemName.trim()) return;
              createNewItemMutation.mutate({ form: newItem, rowIndex: newItemRowIndex ?? null });
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-item-code">Item code <span className="text-muted-foreground font-normal">(auto-generated)</span></Label>
                <Input id="new-item-code" value={newItem.itemCode} readOnly disabled className="bg-muted" placeholder="Set name and category" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-item-category">Category *</Label>
                <Select value={newItem.category} onValueChange={(v) => handleNewItemInputChange('category', v)}>
                  <SelectTrigger id="new-item-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {inventoryCategories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="new-item-name">Item name *</Label>
                <Input id="new-item-name" value={newItem.itemName} onChange={(e) => handleNewItemInputChange('itemName', e.target.value)} placeholder="e.g. Paracetamol 500mg" required />
              </div>
              {shouldShowField('unitOfMeasure', newItem.category) && (
                <div className="space-y-2">
                  <Label htmlFor="new-item-uom">{getFieldLabel('unitOfMeasure', newItem.category)} *</Label>
                  <Select value={newItem.unitOfMeasure} onValueChange={(v) => handleNewItemInputChange('unitOfMeasure', v)}>
                    <SelectTrigger id="new-item-uom"><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {PO_UNITS_OF_MEASURE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {shouldShowField('dosageForm', newItem.category) && (
                <div className="space-y-2">
                  <Label htmlFor="new-item-dosage">{getFieldLabel('dosageForm', newItem.category)}{getFieldsForCategory(newItem.category).required.includes('dosageForm') ? ' *' : ''}</Label>
                  <Select value={newItem.dosageForm || ''} onValueChange={(v) => handleNewItemInputChange('dosageForm', v)}>
                    <SelectTrigger id="new-item-dosage"><SelectValue placeholder="Select dosage form" /></SelectTrigger>
                    <SelectContent>
                      {PO_DOSAGE_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {shouldShowField('equipmentStatus', newItem.category) && (
                <div className="space-y-2">
                  <Label htmlFor="new-item-equip">{getFieldLabel('equipmentStatus', newItem.category)}{getFieldsForCategory(newItem.category).required.includes('equipmentStatus') ? ' *' : ''}</Label>
                  <Select value={newItem.equipmentStatus || 'functional'} onValueChange={(v) => handleNewItemInputChange('equipmentStatus', v)}>
                    <SelectTrigger id="new-item-equip"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PO_EQUIPMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsNewItemDialogOpen(false); resetNewItemForm(); }}>Cancel</Button>
              <Button type="submit" disabled={!newItem.itemName.trim() || createNewItemMutation.isPending} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
                {createNewItemMutation.isPending ? 'Creating…' : 'Create & use'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit PO Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update purchase order details and status
            </DialogDescription>
          </DialogHeader>
          
          {selectedPO && (
            <form onSubmit={(e) => {
              e.preventDefault();
              updatePOMutation.mutate({
                id: selectedPO.id,
                data: {
                  supplierId: editForm.supplierId,
                  expectedDelivery: editForm.expectedDelivery || undefined,
                  notes: editForm.notes
                }
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Supplier *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => openNewSupplierDialog('edit')}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create new supplier
                    </Button>
                  </div>
                  <Select value={editForm.supplierId || undefined} onValueChange={(v) => setEditForm(prev => ({ ...prev, supplierId: v }))} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input
                    type="date"
                    value={editForm.expectedDelivery}
                    onChange={(e) => setEditForm(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePOMutation.isPending} style={{
                  backgroundColor: 'var(--uventorybiz-navy)',
                  color: 'white'
                }} className="hover:opacity-90">
                  {updatePOMutation.isPending ? "Updating..." : "Update Purchase Order"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Purchase Order Status</DialogTitle>
            <DialogDescription>
              Update the status of {selectedPO?.poNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPO && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updatePOMutation.mutate({
                id: selectedPO.id,
                data: {
                  status: formData.get('status') as any
                }
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-change">New Status</Label>
                <Select name="status" defaultValue={selectedPO.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Awaiting supplier confirmation</SelectItem>
                    <SelectItem value="ordered">Confirmed by supplier</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="partially_received">Partially Received</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePOMutation.isPending} style={{
                  backgroundColor: 'var(--uventorybiz-navy)',
                  color: 'white'
                }} className="hover:opacity-90">
                  {updatePOMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive Goods Modal */}
      <Dialog
        open={isReceiveModalOpen}
        onOpenChange={(open) => {
          setIsReceiveModalOpen(open);
          if (!open) {
            setReceiveQuantities({});
            setReceiveLocationId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Goods</DialogTitle>
            <DialogDescription>
              {selectedPO?.poNumber} – Enter quantities received
              {isMultiLocation || activeStores.length > 1
                ? ' and choose which store or fleet unit gets the stock.'
                : '. Stock will update at your default location.'}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receive-location">
                  Receive into location {(isMultiLocation || activeStores.length > 1) && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={receiveLocationId || defaultReceiveLocationId || undefined}
                  onValueChange={setReceiveLocationId}
                >
                  <SelectTrigger id="receive-location" data-testid="select-receive-location">
                    <SelectValue placeholder="Select store or fleet unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStores.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.locationCode} – {loc.locationName}
                        {loc.locationKind === 'fleet' ? ' (Fleet)' : loc.isPrimary ? ' (Primary)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Includes fixed stores and fleet units (e.g. when a vehicle collects goods from a supplier).
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Already received</TableHead>
                    <TableHead>Qty to receive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((line, index) => {
                    const remaining = (line.quantityOrdered ?? 0) - (line.quantityReceived ?? 0);
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{line.itemName ?? getItemName(line.itemId)}</div>
                          <div className="text-sm text-muted-foreground">{line.itemCode ?? getItemCode(line.itemId)}</div>
                        </TableCell>
                        <TableCell>{line.quantityOrdered}</TableCell>
                        <TableCell>{line.quantityReceived ?? 0}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            placeholder={`Max ${remaining}`}
                            value={receiveQuantities[line.id] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value ? parseInt(e.target.value, 10) : 0;
                              setReceiveQuantities(prev => ({ ...prev, [line.id]: isNaN(v) ? 0 : Math.max(0, Math.min(remaining, v)) }));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsReceiveModalOpen(false); setReceiveQuantities({}); setReceiveLocationId(''); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReceiveSubmit}
                  disabled={
                    receiveItemsMutation.isPending ||
                    Object.values(receiveQuantities).every((q) => !q || q === 0) ||
                    !(receiveLocationId || defaultReceiveLocationId)
                  }
                  style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }}
                  className="hover:opacity-90"
                >
                  {receiveItemsMutation.isPending ? 'Receiving...' : 'Receive'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse Receipt Modal */}
      <Dialog
        open={isReverseModalOpen}
        onOpenChange={(open) => {
          setIsReverseModalOpen(open);
          if (!open) {
            setReverseQuantities({});
            setReverseLocationId('');
            setReverseNotes('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reverse receipt</DialogTitle>
            <DialogDescription>
              {selectedPO?.poNumber} – Remove previously received stock from a store and reduce received quantities on this PO.
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reverse-location">
                  Reverse from location <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={reverseLocationId || defaultReceiveLocationId || undefined}
                  onValueChange={setReverseLocationId}
                >
                  <SelectTrigger id="reverse-location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStores.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.locationCode} – {loc.locationName}
                        {loc.locationKind === 'fleet' ? ' (Fleet)' : loc.isPrimary ? ' (Primary)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the location that originally received this stock. Reversal fails if that location no longer has enough quantity.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Stock here</TableHead>
                    <TableHead>Qty to reverse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems
                    .filter((line) => (line.quantityReceived ?? 0) > 0)
                    .map((line, index) => {
                      const received = line.quantityReceived ?? 0;
                      const onHand = stockAtReverseLocation(line.itemId);
                      const maxReverse = Math.min(received, onHand);
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{line.itemName ?? getItemName(line.itemId)}</div>
                            <div className="text-sm text-muted-foreground">{line.itemCode ?? getItemCode(line.itemId)}</div>
                          </TableCell>
                          <TableCell>{received}</TableCell>
                          <TableCell>{onHand}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={maxReverse}
                              placeholder={`Max ${maxReverse}`}
                              value={reverseQuantities[line.id] ?? ''}
                              disabled={maxReverse <= 0}
                              onChange={(e) => {
                                const v = e.target.value ? parseInt(e.target.value, 10) : 0;
                                setReverseQuantities((prev) => ({
                                  ...prev,
                                  [line.id]: isNaN(v) ? 0 : Math.max(0, Math.min(maxReverse, v)),
                                }));
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {poItems.every((l) => (l.quantityReceived ?? 0) <= 0) && (
                <p className="text-sm text-muted-foreground">No received quantities to reverse on this PO.</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="reverse-notes">Notes (optional)</Label>
                <Textarea
                  id="reverse-notes"
                  rows={2}
                  value={reverseNotes}
                  onChange={(e) => setReverseNotes(e.target.value)}
                  placeholder="Reason for reversing this receipt"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsReverseModalOpen(false);
                    setReverseQuantities({});
                    setReverseLocationId('');
                    setReverseNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReverseSubmit}
                  disabled={
                    reverseReceiveMutation.isPending ||
                    Object.values(reverseQuantities).every((q) => !q || q === 0) ||
                    !(reverseLocationId || defaultReceiveLocationId)
                  }
                  variant="destructive"
                >
                  {reverseReceiveMutation.isPending ? 'Reversing…' : 'Reverse receipt'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View PO Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPO?.poNumber} - {selectedPO?.supplier}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order Date</Label>
                  <p>{new Date(selectedPO.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expected Delivery</Label>
                  <p>{selectedPO.expectedDelivery ? new Date(selectedPO.expectedDelivery).toLocaleDateString() : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={getStatusColor(selectedPO.status) as any} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(selectedPO.status)}
                    {selectedPO.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="font-medium">{formatCurrency(parseFloat(selectedPO.totalAmount || '0'))}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedPO.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-base font-medium">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.itemName ?? getItemName(item.itemId)}</div>
                            <div className="text-sm text-muted-foreground">{item.itemCode ?? getItemCode(item.itemId)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantityOrdered}</TableCell>
                        <TableCell>{item.quantityReceived}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.unitCost))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.totalCost))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  );
}