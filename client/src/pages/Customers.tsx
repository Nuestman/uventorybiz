import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { BulkCsvImportDialog } from '@/components/BulkCsvImportDialog';

interface Customer {
  id: string;
  customerNumber?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  status: 'active',
  notes: '',
};

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create customer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsCreateOpen(false);
      setForm(emptyForm);
      toast({ title: 'Success', description: 'Customer created.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: Partial<Customer> & { id: string }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update customer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setEditing(null);
      setForm(emptyForm);
      toast({ title: 'Success', description: 'Customer updated.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setDeleteTarget(null);
      toast({ title: 'Success', description: 'Customer deleted.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.customerNumber && c.customerNumber.toLowerCase().includes(term))
    );
  });

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      status: c.status ?? 'active',
      notes: c.notes ?? '',
    });
  };

  const formFields = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>First name *</Label>
          <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
        </div>
        <div className="grid gap-2">
          <Label>Last name *</Label>
          <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
      </div>
      <div className="grid gap-2">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
      </div>
      <div className="grid gap-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} />
      </div>
    </>
  );

  const canSubmit = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage customers for sales, receipts, and the customer portal</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkCsvImportDialog
            title="Bulk Import Customers"
            description="Upload a CSV or paste rows. New customers are created immediately for POS and the portal."
            formatHint="firstName,lastName,email,phone,status,notes"
            endpoint="/api/customers/bulk-import"
            invalidateKeys={[['/api/customers']]}
            templateHref="/templates/customers-import.csv"
            placeholder={"firstName,lastName,email,phone,status,notes\nAma,Mensah,ama@example.com,0244111222,active,Walk-in regular"}
          />
          <Button onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All customers</CardTitle>
          <CardDescription>Attach these to POS sales and grant them portal access from Admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading customers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.customerNumber || '—'}</TableCell>
                    <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                        {c.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {customers.length === 0 ? 'No customers yet. Add one to attach to sales and portal access.' : 'No matches for your search.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[500px] flex-col sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>A customer number is generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
            {formFields}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!canSubmit || createMutation.isPending} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[500px] flex-col sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>{editing?.customerNumber ? `Customer ${editing.customerNumber}` : 'Update customer details.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
            {formFields}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && updateMutation.mutate({ id: editing.id, ...form })} disabled={!canSubmit || updateMutation.isPending} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : ''}&quot;. Sales history that references this customer may be affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
