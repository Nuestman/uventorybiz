import { useState } from 'react';
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
import { ArrowUpCircle, ArrowDownCircle, Package, Plus, Search, FileText, TrendingUp, TrendingDown, X, Trash2, MoreHorizontal, Edit, Eye, History, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { useTenantSettings } from '@/hooks/useTenantSettings';

interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  transactionType: 'receipt' | 'issue' | 'adjustment' | 'transfer' | 'disposal';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: string;
  totalCost?: string;
  reference?: string;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  category: string;
  unitCost: string;
  currentStock: number;
  unitOfMeasure: string;
}

const TRANSACTION_REASONS = {
  receipt: [
    'Purchase order delivery',
    'Emergency procurement',
    'Stock transfer in',
    'Donation received',
    'Insurance replacement'
  ],
  issue: [
    'Medical treatment',
    'Emergency response',
    'Routine maintenance',
    'Training exercise',
    'Stock transfer out'
  ],
  adjustment: [
    'Stock count correction',
    'Damaged goods write-off',
    'Expired items removal',
    'System error correction',
    'Inventory audit'
  ],
  transfer: [
    'Inter-department transfer',
    'Location change',
    'Facility relocation',
    'Equipment redistribution'
  ],
  disposal: [
    'Expired medication disposal',
    'Damaged equipment disposal',
    'Recalled items disposal',
    'End-of-life disposal',
    'Environmental disposal'
  ]
};

export default function TransactionHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenantSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/inventory-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/inventory-transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  });

  // Fetch inventory items for filtering
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryTransaction> }) => {
      const response = await fetch(`/api/inventory-transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Transaction updated successfully"
      });
    }
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/inventory-transactions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
    }
  });

  const handleViewTransaction = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleEditTransaction = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      deleteTransactionMutation.mutate(id);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
      case 'issue': return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
      case 'adjustment': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'transfer': return <Package className="w-4 h-4 text-purple-600" />;
      case 'disposal': return <Trash2 className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-green-100 text-green-800';
      case 'issue': return 'bg-red-100 text-red-800';
      case 'adjustment': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'disposal': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuantityColor = (type: string, quantity: number) => {
    if (type === 'issue' || type === 'disposal') {
      return "text-red-600 font-medium";
    }
    if (type === 'receipt') {
      return "text-green-600 font-medium";
    }
    return quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium";
  };

  const getFormattedQuantity = (type: string, quantity: number) => {
    if (type === 'issue' || type === 'disposal') {
      const absQuantity = Math.abs(quantity);
      return `-${absQuantity}`;
    }
    if (type === 'receipt') {
      const absQuantity = Math.abs(quantity);
      return `+${absQuantity}`;
    }
    return quantity > 0 ? `+${quantity}` : `${quantity}`;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction: InventoryTransaction) => {
    const matchesSearch = transaction.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || transaction.transactionType === selectedType;
    const matchesItem = selectedItem === 'all' || transaction.itemId === selectedItem;
    
    return matchesSearch && matchesType && matchesItem;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <MobileNav />
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
            Transaction History
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            View and manage historical inventory transactions
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-500">
            {filteredTransactions.length} records
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger data-testid="select-transaction-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="disposal">Disposal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger data-testid="select-item">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {inventoryItems.map((item: InventoryItem) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.itemName} ({item.itemCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historical Transactions
          </CardTitle>
          <CardDescription>
            Complete history of all inventory movements and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-auto max-h-[600px]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Stock Change</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">Loading transactions...</TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No transactions found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction: InventoryTransaction, index: number) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transactionType)}
                          <Badge className={getTransactionBadgeColor(transaction.transactionType)}>
                            {transaction.transactionType.charAt(0).toUpperCase() + transaction.transactionType.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.itemName}</div>
                          <div className="text-sm text-gray-500">{transaction.itemCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className={getQuantityColor(transaction.transactionType, transaction.quantity)}>
                        {getFormattedQuantity(transaction.transactionType, transaction.quantity)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transaction.previousStock} → {transaction.newStock}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.unitCost ? formatCurrency(parseFloat(transaction.unitCost)) : '-'}
                      </TableCell>
                      <TableCell>{transaction.reference || '-'}</TableCell>
                      <TableCell>{transaction.reason || '-'}</TableCell>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transaction.createdByName}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${transaction.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTransaction(transaction)} data-testid={`button-view-${transaction.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)} data-testid={`button-edit-${transaction.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600"
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[600px] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateTransactionMutation.mutate({
                id: selectedTransaction.id,
                data: {
                  reference: formData.get('reference') as string,
                  reason: formData.get('reason') as string,
                  notes: formData.get('notes') as string
                }
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-medium">{selectedTransaction.itemName}</div>
                    <div className="text-sm text-gray-500">{selectedTransaction.itemCode}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    <Badge className={getTransactionBadgeColor(selectedTransaction.transactionType)}>
                      {selectedTransaction.transactionType.charAt(0).toUpperCase() + selectedTransaction.transactionType.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="p-2 bg-gray-50 rounded border font-medium">
                    {getFormattedQuantity(selectedTransaction.transactionType, selectedTransaction.quantity)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stock Change</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">
                    {selectedTransaction.previousStock} → {selectedTransaction.newStock}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-reference">Reference</Label>
                <Input
                  id="edit-reference"
                  name="reference"
                  defaultValue={selectedTransaction.reference || ''}
                  placeholder="PO number, transfer ID, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason</Label>
                <Select name="reason" defaultValue={selectedTransaction.reason || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_REASONS[selectedTransaction.transactionType]?.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  defaultValue={selectedTransaction.notes || ''}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTransactionMutation.isPending} style={{
                  backgroundColor: 'var(--uventorybiz-navy)',
                  color: 'white'
                }} className="hover:opacity-90">
                  {updateTransactionMutation.isPending ? "Updating..." : "Update Transaction"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Transaction Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[600px] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete transaction information
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="font-medium">{selectedTransaction.itemName}</div>
                    <div className="text-sm text-gray-500">{selectedTransaction.itemCode}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="p-3 bg-gray-50 rounded">
                    <Badge className={getTransactionBadgeColor(selectedTransaction.transactionType)}>
                      {selectedTransaction.transactionType.charAt(0).toUpperCase() + selectedTransaction.transactionType.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className={`p-3 bg-gray-50 rounded font-medium ${getQuantityColor(selectedTransaction.transactionType, selectedTransaction.quantity)}`}>
                    {getFormattedQuantity(selectedTransaction.transactionType, selectedTransaction.quantity)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stock Change</Label>
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    {selectedTransaction.previousStock} → {selectedTransaction.newStock}
                  </div>
                </div>
                {selectedTransaction.unitCost && (
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <div className="p-3 bg-gray-50 rounded">
                      {formatCurrency(parseFloat(selectedTransaction.unitCost))}
                    </div>
                  </div>
                )}
                {selectedTransaction.totalCost && (
                  <div className="space-y-2">
                    <Label>Total Cost</Label>
                    <div className="p-3 bg-gray-50 rounded font-medium">
                      {formatCurrency(parseFloat(selectedTransaction.totalCost))}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedTransaction.reference && (
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <div className="p-3 bg-gray-50 rounded">{selectedTransaction.reference}</div>
                </div>
              )}
              
              {selectedTransaction.reason && (
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <div className="p-3 bg-gray-50 rounded">{selectedTransaction.reason}</div>
                </div>
              )}
              
              {selectedTransaction.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <div className="p-3 bg-gray-50 rounded">{selectedTransaction.notes}</div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Created By</Label>
                  <div className="p-3 bg-gray-50 rounded">{selectedTransaction.createdByName}</div>
                </div>
                <div className="space-y-2">
                  <Label>Created At</Label>
                  <div className="p-3 bg-gray-50 rounded">
                    {new Date(selectedTransaction.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}