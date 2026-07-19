import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Wrench, CheckCircle, XCircle, Clock, Search, Settings, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MobileNav from '@/components/MobileNav';

/** Location can be a string (legacy) or an object from the API */
type LocationDisplay = string | { id: string; locationName?: string; locationCode?: string } | null | undefined;

interface Equipment {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  equipmentStatus: 'functional' | 'faulty' | 'maintenance' | 'decommissioned';
  serialNumber?: string;
  supplier?: string;
  location?: LocationDisplay;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

function formatLocation(loc: LocationDisplay): string {
  if (loc == null) return 'Not specified';
  if (typeof loc === 'string') return loc;
  return loc.locationName ?? loc.locationCode ?? loc.id ?? 'Not specified';
}

interface StatusUpdate {
  equipmentId: string;
  newStatus: 'functional' | 'faulty' | 'maintenance' | 'decommissioned';
  maintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export default function EquipmentTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate>({
    equipmentId: '',
    newStatus: 'functional',
    maintenanceDate: '',
    nextMaintenanceDate: ''
  });

  // Fetch equipment (filter inventory to only show equipment category)
  const { data: allInventory = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Filter to equipment category and apply status filter
  const equipment = allInventory.filter(item => {
    const isEquipment = item.category === 'equipment';
    const matchesStatus = selectedStatus === 'all' || item.equipmentStatus === selectedStatus;
    return isEquipment && matchesStatus;
  });

  // Update equipment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: StatusUpdate) => {
      const response = await fetch(`/api/inventory/${data.equipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipmentStatus: data.newStatus,
          lastMaintenanceDate: data.maintenanceDate || null,
          nextMaintenanceDate: data.nextMaintenanceDate || null
        })
      });
      if (!response.ok) throw new Error('Failed to update equipment status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setIsStatusModalOpen(false);
      resetStatusForm();
      toast({
        title: "Success",
        description: "Equipment status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update equipment status",
        variant: "destructive"
      });
    }
  });

  const resetStatusForm = () => {
    setStatusUpdate({
      equipmentId: '',
      newStatus: 'functional',
      maintenanceDate: '',
      nextMaintenanceDate: ''
    });
    setSelectedEquipment(null);
  };

  const handleStatusUpdate = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setStatusUpdate({
      equipmentId: equipment.id,
      newStatus: equipment.equipmentStatus || 'functional',
      maintenanceDate: equipment.lastMaintenanceDate ? new Date(equipment.lastMaintenanceDate).toISOString().split('T')[0] : '',
      nextMaintenanceDate: equipment.nextMaintenanceDate ? new Date(equipment.nextMaintenanceDate).toISOString().split('T')[0] : ''
    });
    setIsStatusModalOpen(true);
  };

  const handleSubmitStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatusMutation.mutate(statusUpdate);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'functional':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'faulty':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'decommissioned':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'functional':
        return 'default';
      case 'faulty':
        return 'destructive';
      case 'maintenance':
        return 'secondary';
      case 'decommissioned':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Filter equipment based on search
  const filteredEquipment = equipment.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment checks</h1>
          <p className="text-muted-foreground">
            Monitor equipment status, maintenance schedules, and operational condition
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Functional</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {equipment.filter(e => e.equipmentStatus === 'functional').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {equipment.filter(e => e.equipmentStatus === 'faulty' || e.equipmentStatus === 'maintenance').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {equipment.filter(e => e.equipmentStatus === 'decommissioned').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
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
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="faulty">Faulty</SelectItem>
            <SelectItem value="maintenance">Under Maintenance</SelectItem>
            <SelectItem value="decommissioned">Decommissioned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>
            Track all equipment status and maintenance schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading equipment...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Maintenance</TableHead>
                  <TableHead>Next Maintenance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item, index) => {
                  // Check for issues that should highlight the row
                  const isFaulty = item.equipmentStatus === 'faulty';
                  const isMaintenance = item.equipmentStatus === 'maintenance';
                  const hasIssue = isFaulty || isMaintenance;
                  
                  // Determine row background color
                  let rowBgClass = index % 2 === 0 ? "bg-white" : "bg-gray-50/50";
                  if (hasIssue) {
                    if (isFaulty) {
                      rowBgClass = "bg-red-50 hover:bg-red-100";
                    } else if (isMaintenance) {
                      rowBgClass = "bg-yellow-50 hover:bg-yellow-100";
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
                    <TableRow key={item.id} className={rowBgClass}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-muted-foreground">{item.itemCode}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.serialNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(item.equipmentStatus) as any} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(item.equipmentStatus)}
                        {item.equipmentStatus || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLocation(item.location)}</TableCell>
                    <TableCell>
                      {item.lastMaintenanceDate ? 
                        new Date(item.lastMaintenanceDate).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {item.nextMaintenanceDate ? (
                        <span className={nextMaintenanceStatus?.color || ''}>
                          {nextMaintenanceStatus?.label || new Date(item.nextMaintenanceDate).toLocaleDateString()}
                        </span>
                      ) : (
                        'Not scheduled'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(item)}
                        data-testid={`button-update-status-${item.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Update Status
                      </Button>
                    </TableCell>
                    </TableRow>
                  );
                })}
                {filteredEquipment.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No equipment found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Equipment Status</DialogTitle>
            <DialogDescription>
              Update the operational status and maintenance information for {selectedEquipment?.itemName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitStatusUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newStatus">Equipment Status *</Label>
              <Select 
                value={statusUpdate.newStatus} 
                onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, newStatus: value as any }))}
              >
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="faulty">Faulty</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(statusUpdate.newStatus === 'maintenance' || statusUpdate.newStatus === 'functional') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceDate">Last Maintenance Date</Label>
                  <Input
                    id="maintenanceDate"
                    type="date"
                    value={statusUpdate.maintenanceDate}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                    data-testid="input-maintenance-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextMaintenanceDate">Next Maintenance Date</Label>
                  <Input
                    id="nextMaintenanceDate"
                    type="date"
                    value={statusUpdate.nextMaintenanceDate}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, nextMaintenanceDate: e.target.value }))}
                    data-testid="input-next-maintenance-date"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateStatusMutation.isPending}
                data-testid="button-submit-status-update"
              >
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  );
}