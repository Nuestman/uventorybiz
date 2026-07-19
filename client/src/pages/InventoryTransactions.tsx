import { useEffect, useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpCircle, ArrowDownCircle, Package, Plus, Search, FileText, TrendingUp, TrendingDown, X, Trash2, MoreHorizontal, Edit, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { ListPagination } from '@/components/ListPagination';

const PAGE_SIZE = 20;

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

interface BulkTransactionItem {
  itemId: string;
  transactionType: 'receipt' | 'issue' | 'adjustment' | 'transfer' | 'disposal';
  quantity: number;
  unitCost?: number;
  reference?: string;
  reason?: string;
  notes?: string;
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
    'Physical loss'
  ],
  transfer: [
    'Inter-department transfer',
    'Location change',
    'Equipment reallocation',
    'Temporary assignment'
  ],
  disposal: [
    'Expired medication',
    'Damaged equipment',
    'End of life disposal',
    'Recall compliance',
    'Safety disposal'
  ]
};

export default function InventoryTransactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenantSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [bulkTransactions, setBulkTransactions] = useState<BulkTransactionItem[]>([
    {
      itemId: '',
      transactionType: 'receipt',
      quantity: 0,
      unitCost: 0,
      reference: '',
      reason: '',
      notes: ''
    }
  ]);

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<InventoryTransaction[]>({
    queryKey: ['/api/inventory-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/inventory-transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  });

  // Fetch inventory items
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: BulkTransactionItem) => {
      const response = await fetch('/api/inventory-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to update transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to delete transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
    }
  });

  const handleCreateTransactions = async () => {
    try {
      const validTransactions = bulkTransactions.filter(t => 
        t.itemId && t.quantity !== 0 && t.transactionType
      );

      if (validTransactions.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one valid transaction.",
          variant: "destructive"
        });
        return;
      }

      // Process each transaction
      for (const transaction of validTransactions) {
        await createTransactionMutation.mutateAsync(transaction);
      }

      toast({
        title: "Success",
        description: `${validTransactions.length} transaction(s) created successfully.`
      });

      setIsCreateModalOpen(false);
      setBulkTransactions([{
        itemId: '',
        transactionType: 'receipt',
        quantity: 0,
        unitCost: 0,
        reference: '',
        reason: '',
        notes: ''
      }]);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create transactions.",
        variant: "destructive"
      });
    }
  };

  const addTransactionRow = () => {
    setBulkTransactions([...bulkTransactions, {
      itemId: '',
      transactionType: 'receipt',
      quantity: 0,
      unitCost: 0,
      reference: '',
      reason: '',
      notes: ''
    }]);
  };

  const removeTransactionRow = (index: number) => {
    if (bulkTransactions.length > 1) {
      setBulkTransactions(bulkTransactions.filter((_, i) => i !== index));
    }
  };

  const updateTransaction = (index: number, field: keyof BulkTransactionItem, value: any) => {
    const updated = [...bulkTransactions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-populate unit cost from inventory when item is selected
    if (field === 'itemId' && value) {
      const selectedItem = inventoryItems.find(item => item.id === value);
      if (selectedItem?.unitCost) {
        updated[index].unitCost = parseFloat(selectedItem.unitCost);
      }
    }
    
    setBulkTransactions(updated);
  };

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
    // Issue transactions should always show as negative/red
    if (type === 'issue' || type === 'disposal') {
      return "text-red-600 font-medium";
    }
    // Receipt transactions should always show as positive/green
    if (type === 'receipt') {
      return "text-green-600 font-medium";
    }
    // For adjustments and transfers, use the sign of the quantity
    return quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium";
  };

  const getFormattedQuantity = (type: string, quantity: number) => {
    // Issue and disposal transactions should always show as negative
    if (type === 'issue' || type === 'disposal') {
      const absQuantity = Math.abs(quantity);
      return `-${absQuantity}`;
    }
    // Receipt transactions should always show as positive
    if (type === 'receipt') {
      const absQuantity = Math.abs(quantity);
      return `+${absQuantity}`;
    }
    // For adjustments and transfers, show the actual sign
    return quantity > 0 ? `+${quantity}` : `${quantity}`;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || transaction.transactionType === selectedType;
      const matchesItem = selectedItem === 'all' || transaction.itemId === selectedItem;
      return matchesSearch && matchesType && matchesItem;
    });
  }, [transactions, searchTerm, selectedType, selectedItem]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedType, selectedItem]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
            Inventory Transactions
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Track all inventory movements and stock changes
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            backgroundColor: 'var(--uventorybiz-navy)',
            color: 'white'
          }}
          className="hover:opacity-90 shrink-0"
          data-testid="button-create-transaction"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Transaction
        </Button>
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
              <SelectTrigger data-testid="select-item-filter">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {inventoryItems.map((item) => (
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
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Complete log of all inventory movements
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 space-y-4">
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
                  <TableHead>By</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedTransactions.map((transaction, index) => (
                    <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell className="font-medium">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </TableCell>
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
          {!isLoading && filteredTransactions.length > 0 ? (
            <div className="px-4 sm:px-0 pb-4 sm:pb-0">
              <ListPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filteredTransactions.length}
                onPageChange={setPage}
                itemLabel="transactions"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Create Transaction Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] p-0 sm:w-full">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Create Inventory Transactions</DialogTitle>
            <DialogDescription>
              Add multiple inventory transactions with different types and items
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] px-6">
            <div className="space-y-4">
              {bulkTransactions.map((transaction, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Transaction {index + 1}</h4>
                    {bulkTransactions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTransactionRow(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Item *</Label>
                      <Select
                        value={transaction.itemId}
                        onValueChange={(value) => updateTransaction(index, 'itemId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.itemName} ({item.itemCode}) - Stock: {item.currentStock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Transaction Type *</Label>
                      <Select
                        value={transaction.transactionType}
                        onValueChange={(value) => updateTransaction(index, 'transactionType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receipt">Receipt (+)</SelectItem>
                          <SelectItem value="issue">Issue (-)</SelectItem>
                          <SelectItem value="adjustment">Adjustment (±)</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="disposal">Disposal (-)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        value={transaction.quantity}
                        onChange={(e) => updateTransaction(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label>Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={transaction.unitCost}
                        onChange={(e) => updateTransaction(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <Label>Reference</Label>
                      <Input
                        value={transaction.reference}
                        onChange={(e) => updateTransaction(index, 'reference', e.target.value)}
                        placeholder="PO number, etc."
                      />
                    </div>
                    
                    <div>
                      <Label>Reason</Label>
                      <Select
                        value={transaction.reason}
                        onValueChange={(value) => updateTransaction(index, 'reason', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSACTION_REASONS[transaction.transactionType]?.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label>Notes</Label>
                      <Textarea
                        value={transaction.notes}
                        onChange={(e) => updateTransaction(index, 'notes', e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={addTransactionRow}
                className="w-full"
                data-testid="button-add-transaction-row"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Transaction
              </Button>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransactions}
              disabled={createTransactionMutation.isPending}
              data-testid="button-create-transactions"
              style={{
                backgroundColor: 'var(--uventorybiz-navy)',
                color: 'white'
              }}
              className="hover:opacity-90"
            >
              {createTransactionMutation.isPending ? 'Creating...' : 'Create Transactions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Item</Label>
                  <div>
                    <div className="font-medium">{selectedTransaction.itemName}</div>
                    <div className="text-sm text-gray-500">{selectedTransaction.itemCode}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Transaction Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTransactionIcon(selectedTransaction.transactionType)}
                    <Badge className={getTransactionBadgeColor(selectedTransaction.transactionType)}>
                      {selectedTransaction.transactionType.charAt(0).toUpperCase() + selectedTransaction.transactionType.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className={getQuantityColor(selectedTransaction.transactionType, selectedTransaction.quantity)}>
                    {getFormattedQuantity(selectedTransaction.transactionType, selectedTransaction.quantity)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Stock Change</Label>
                  <p className="text-sm">{selectedTransaction.previousStock} → {selectedTransaction.newStock}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Unit Cost</Label>
                  <p>{selectedTransaction.unitCost ? formatCurrency(parseFloat(selectedTransaction.unitCost)) : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Cost</Label>
                  <p>{selectedTransaction.totalCost ? formatCurrency(parseFloat(selectedTransaction.totalCost)) : 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reference</Label>
                  <p>{selectedTransaction.reference || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p>{new Date(selectedTransaction.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p>{selectedTransaction.createdByName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reason</Label>
                  <p>{selectedTransaction.reason || 'Not specified'}</p>
                </div>
              </div>
              
              {selectedTransaction.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  );
}