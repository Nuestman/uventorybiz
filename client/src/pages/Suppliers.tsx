import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { BulkCsvImportDialog } from '@/components/BulkCsvImportDialog';

interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Suppliers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create supplier');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setIsCreateOpen(false);
      setForm(emptyForm);
      toast({ title: 'Success', description: 'Supplier created.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: Partial<Supplier> & { id: string }) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update supplier');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setEditing(null);
      setForm(emptyForm);
      toast({ title: 'Success', description: 'Supplier updated.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDeleteTarget(null);
      toast({ title: 'Success', description: 'Supplier deleted.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = suppliers.filter(
    (s) =>
      !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactName && s.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name ?? '',
      contactName: s.contactName ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage suppliers for purchase orders and procurement</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkCsvImportDialog
            title="Bulk Import Suppliers"
            description="Upload a CSV or paste rows. Suppliers become available for purchase orders right away."
            formatHint="name,contactName,email,phone,address,notes"
            endpoint="/api/suppliers/bulk-import"
            invalidateKeys={[['/api/suppliers']]}
            templateHref="/templates/suppliers-import.csv"
            placeholder={"name,contactName,email,phone,address,notes\nAccra Distributors Ltd,Kofi Asante,orders@accra-dist.com,0302123456,\"12 Ring Road, Accra\",Primary FMCG"}
          />
          <Button onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All suppliers</CardTitle>
          <CardDescription>Use these in purchase orders when creating or editing a PO.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading suppliers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactName || '—'}</TableCell>
                    <TableCell>{s.email || '—'}</TableCell>
                    <TableCell>{s.phone || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-red-600">
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {suppliers.length === 0 ? 'No suppliers yet. Add one to use in purchase orders.' : 'No matches for your search.'}
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
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>Create a supplier to select when creating purchase orders.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input id="create-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-contact">Contact name</Label>
              <Input id="create-contact" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Contact person" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input id="create-phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-address">Address</Label>
              <Textarea id="create-address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea id="create-notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name.trim() || createMutation.isPending} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[500px] flex-col sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit supplier</DialogTitle>
            <DialogDescription>Update supplier details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier name" />
            </div>
            <div className="grid gap-2">
              <Label>Contact name</Label>
              <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Contact person" />
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
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && updateMutation.mutate({ id: editing.id, ...form })} disabled={!form.name.trim() || updateMutation.isPending} style={{ backgroundColor: 'var(--uventorybiz-navy)', color: 'white' }} className="hover:opacity-90">
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. Purchase orders that use this supplier may be affected. This cannot be undone.
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
