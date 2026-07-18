import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Search, Mail, Bell, MessageSquare, Phone, Save, Loader2, AlertCircle, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NotificationType {
  id: string;
  key: string;
  displayName: string;
  category: string;
  severitySupported: boolean;
}

interface ChannelPreference {
  channel: string;
  enabled: boolean;
  minSeverity: string | null;
  adminManaged: boolean;
}

interface NotificationPreference {
  notificationType: NotificationType;
  channels: ChannelPreference[];
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface RolePreferenceState {
  [notificationTypeId: string]: {
    [channel: string]: {
      enabled: boolean;
      minSeverity: string | null;
    };
  };
}

export default function NotificationPreferencesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [rolePreferences, setRolePreferences] = useState<RolePreferenceState>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<RolePreferenceState>({});
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Fetch notification types
  const { data: notificationTypes = [] } = useQuery<NotificationType[]>({
    queryKey: ['/api/notification-types'],
  });

  // Fetch user preferences (for role defaults preview)
  const { data: roleDefaults, isLoading: loadingDefaults } = useQuery({
    queryKey: ['/api/admin/notification-preferences/role-defaults', selectedRole],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/notification-preferences/role-defaults/${selectedRole}`);
      const data = await response.json();
      return data;
    },
    enabled: !!selectedRole,
  });

  // Initialize role preferences from defaults or empty state
  useEffect(() => {
    if (notificationTypes.length === 0) return;
    
    const initialState: RolePreferenceState = {};
    notificationTypes.forEach(type => {
      initialState[type.id] = {};
      ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
        // Check if we have defaults for this role
        const defaultPref = roleDefaults?.defaults?.find((d: any) => 
          d.notificationTypeId === type.id && d.channel === channel
        );
        
        initialState[type.id][channel] = {
          enabled: defaultPref?.enabled ?? (channel === 'email' || channel === 'in_app'),
          minSeverity: defaultPref?.minSeverity ?? (type.severitySupported ? 'medium' : null),
        };
      });
    });
    
    setRolePreferences(initialState);
  }, [notificationTypes, roleDefaults, selectedRole]);

  // Fetch all users for individual management
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/all-users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/all-users');
      return response.json();
    },
  });

  // Fetch individual user preferences
  const { data: userPrefsData, refetch: refetchUserPrefs } = useQuery({
    queryKey: ['/api/admin/notification-preferences', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const response = await apiRequest('GET', `/api/admin/notification-preferences/${selectedUserId}`);
      return response.json();
    },
    enabled: !!selectedUserId && isUserDialogOpen,
  });

  // Initialize user preferences when dialog opens
  useEffect(() => {
    if (userPrefsData?.preferences && isUserDialogOpen) {
      const initialState: RolePreferenceState = {};
      notificationTypes.forEach(type => {
        initialState[type.id] = {};
        ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
          const pref = userPrefsData.preferences.find((p: NotificationPreference) => 
            p.notificationType.id === type.id
          )?.channels.find((c: ChannelPreference) => c.channel === channel);
          
          initialState[type.id][channel] = {
            enabled: pref?.enabled ?? false,
            minSeverity: pref?.minSeverity ?? (type.severitySupported ? 'medium' : null),
          };
        });
      });
      setUserPreferences(initialState);
    }
  }, [userPrefsData, isUserDialogOpen, notificationTypes]);

  // Filter users by search
  const filteredUsers = allUsers.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  // Group notification types by category
  const typesByCategory = notificationTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, NotificationType[]>);

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: {
      userIds: string[];
      notificationTypeId: string;
      channel: string;
      enabled: boolean;
      minSeverity?: string | null;
      adminManaged?: boolean;
    }) => {
      return await apiRequest('POST', '/api/admin/notification-preferences/bulk', data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Preferences updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-preferences'] });
      setSelectedUserIds(new Set());
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update preferences',
        variant: 'destructive' 
      });
    },
  });

  // Apply role defaults mutation
  const applyRoleDefaultsMutation = useMutation({
    mutationFn: async (data: { role: string; preferences: any[] }) => {
      return await apiRequest('POST', '/api/admin/notification-preferences/apply-role-defaults', data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role defaults applied successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-preferences'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to apply role defaults',
        variant: 'destructive' 
      });
    },
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email': return 'Email';
      case 'in_app': return 'In-App';
      case 'sms': return 'SMS';
      case 'whatsapp': return 'WhatsApp';
      default: return channel;
    }
  };

  const [bulkPreferences, setBulkPreferences] = useState<RolePreferenceState>({});
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Initialize bulk preferences
  useEffect(() => {
    if (!isBulkDialogOpen || notificationTypes.length === 0) return;
    
    const initialState: RolePreferenceState = {};
    notificationTypes.forEach(type => {
      initialState[type.id] = {};
      ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
        initialState[type.id][channel] = {
          enabled: channel === 'email' || channel === 'in_app',
          minSeverity: type.severitySupported ? 'medium' : null,
        };
      });
    });
    setBulkPreferences(initialState);
  }, [isBulkDialogOpen, notificationTypes]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="role-defaults" className="space-y-4">
        <TabsList>
          <TabsTrigger value="role-defaults">Role-Based Defaults</TabsTrigger>
          <TabsTrigger value="individual">Individual Users</TabsTrigger>
        </TabsList>

        <TabsContent value="role-defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Default Preferences by Role</CardTitle>
              <CardDescription>
                Set default notification preferences for all users with a specific role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="role-select">Role:</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role-select" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="fleet_operator">Fleet operator</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {Object.entries(typesByCategory).map(([category, types]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-lg capitalize">{category}</h3>
                    {types.map((type) => (
                      <Card key={type.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{type.displayName}</h4>
                              {type.severitySupported && (
                                <Badge variant="outline" className="mt-1">Severity-based</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['email', 'in_app', 'sms', 'whatsapp'].map((channel) => {
                              const currentState = rolePreferences[type.id]?.[channel] || {
                                enabled: channel === 'email' || channel === 'in_app',
                                minSeverity: type.severitySupported ? 'medium' : null,
                              };
                              
                              return (
                                <div key={channel} className="flex items-start space-x-2">
                                  <div className="mt-1">{getChannelIcon(channel)}</div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Switch 
                                        checked={currentState.enabled}
                                        onCheckedChange={(checked) => {
                                          setRolePreferences(prev => ({
                                            ...prev,
                                            [type.id]: {
                                              ...prev[type.id],
                                              [channel]: {
                                                ...currentState,
                                                enabled: checked,
                                              },
                                            },
                                          }));
                                        }}
                                        id={`role-${type.id}-${channel}`}
                                      />
                                      <Label htmlFor={`role-${type.id}-${channel}`} className="text-sm">
                                        {getChannelLabel(channel)}
                                      </Label>
                                    </div>
                                    {type.severitySupported && currentState.enabled && (
                                      <Select 
                                        value={currentState.minSeverity || 'low'} 
                                        onValueChange={(value) => {
                                          setRolePreferences(prev => ({
                                            ...prev,
                                            [type.id]: {
                                              ...prev[type.id],
                                              [channel]: {
                                                ...currentState,
                                                minSeverity: value,
                                              },
                                            },
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="low">All</SelectItem>
                                          <SelectItem value="medium">Medium+</SelectItem>
                                          <SelectItem value="high">High+</SelectItem>
                                          <SelectItem value="critical">Critical Only</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>

              <Button 
                onClick={async () => {
                  if (!selectedRole) return;
                  
                  // Build preferences array from state
                  const preferences: any[] = [];
                  notificationTypes.forEach(type => {
                    ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
                      const state = rolePreferences[type.id]?.[channel];
                      if (state) {
                        preferences.push({
                          notificationTypeId: type.id,
                          channel,
                          enabled: state.enabled,
                          minSeverity: state.enabled && type.severitySupported ? state.minSeverity : null,
                        });
                      }
                    });
                  });

                  applyRoleDefaultsMutation.mutate({
                    role: selectedRole,
                    preferences,
                  });
                }}
                disabled={applyRoleDefaultsMutation.isPending || loadingDefaults}
                className="w-full"
              >
                {applyRoleDefaultsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  `Apply to all ${selectedRole.replace('_', ' ')} users`
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual User Management</CardTitle>
              <CardDescription>
                Configure notification preferences for specific users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
                            } else {
                              setSelectedUserIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedUserIds);
                              if (e.target.checked) {
                                newSet.add(user.id);
                              } else {
                                newSet.delete(user.id);
                              }
                              setSelectedUserIds(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setIsUserDialogOpen(true);
                            }}
                          >
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-md">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="flex-1">
                    {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={selectedUserIds.size === 0}>
                        Bulk Update
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Bulk Update Preferences</DialogTitle>
                        <DialogDescription>
                          Configure notification preferences for {selectedUserIds.size} selected user{selectedUserIds.size !== 1 ? 's' : ''}. 
                          This will override existing preferences for the selected users.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {Object.entries(typesByCategory).map(([category, types]) => (
                          <div key={category} className="space-y-2">
                            <h3 className="font-semibold text-lg capitalize">{category}</h3>
                            {types.map((type) => (
                              <Card key={type.id} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{type.displayName}</h4>
                                    {type.severitySupported && (
                                      <Badge variant="outline">Severity-based</Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['email', 'in_app', 'sms', 'whatsapp'].map((channel) => {
                                      const currentState = bulkPreferences[type.id]?.[channel] || {
                                        enabled: channel === 'email' || channel === 'in_app',
                                        minSeverity: type.severitySupported ? 'medium' : null,
                                      };
                                      
                                      return (
                                        <div key={channel} className="flex items-start space-x-2">
                                          <div className="mt-1">{getChannelIcon(channel)}</div>
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Switch 
                                                checked={currentState.enabled}
                                                onCheckedChange={(checked) => {
                                                  setBulkPreferences(prev => ({
                                                    ...prev,
                                                    [type.id]: {
                                                      ...prev[type.id],
                                                      [channel]: {
                                                        ...currentState,
                                                        enabled: checked,
                                                      },
                                                    },
                                                  }));
                                                }}
                                                id={`bulk-${type.id}-${channel}`}
                                              />
                                              <Label htmlFor={`bulk-${type.id}-${channel}`} className="text-sm">
                                                {getChannelLabel(channel)}
                                              </Label>
                                            </div>
                                            {type.severitySupported && currentState.enabled && (
                                              <Select 
                                                value={currentState.minSeverity || 'low'} 
                                                onValueChange={(value) => {
                                                  setBulkPreferences(prev => ({
                                                    ...prev,
                                                    [type.id]: {
                                                      ...prev[type.id],
                                                      [channel]: {
                                                        ...currentState,
                                                        minSeverity: value,
                                                      },
                                                    },
                                                  }));
                                                }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="low">All</SelectItem>
                                                  <SelectItem value="medium">Medium+</SelectItem>
                                                  <SelectItem value="high">High+</SelectItem>
                                                  <SelectItem value="critical">Critical Only</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsBulkDialogOpen(false);
                            setSelectedUserIds(new Set());
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            // Apply bulk preferences to all selected users
                            notificationTypes.forEach(type => {
                              ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
                                const state = bulkPreferences[type.id]?.[channel];
                                if (state) {
                                  bulkUpdateMutation.mutate({
                                    userIds: Array.from(selectedUserIds),
                                    notificationTypeId: type.id,
                                    channel,
                                    enabled: state.enabled,
                                    minSeverity: state.enabled && type.severitySupported ? state.minSeverity : null,
                                    adminManaged: true,
                                  });
                                }
                              });
                            });
                          }}
                          disabled={bulkUpdateMutation.isPending}
                        >
                          {bulkUpdateMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Apply to Selected Users'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual User Preferences Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Preferences: {selectedUserId && allUsers.find(u => u.id === selectedUserId)?.email}
            </DialogTitle>
            <DialogDescription>
              Configure notification preferences for this user
            </DialogDescription>
          </DialogHeader>
          
          {userPrefsData && (
            <div className="space-y-4 py-4">
              {Object.entries(typesByCategory).map(([category, types]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-semibold text-lg capitalize">{category}</h3>
                  {types.map((type) => (
                    <Card key={type.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{type.displayName}</h4>
                          {type.severitySupported && (
                            <Badge variant="outline">Severity-based</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['email', 'in_app', 'sms', 'whatsapp'].map((channel) => {
                            const currentState = userPreferences[type.id]?.[channel] || {
                              enabled: false,
                              minSeverity: type.severitySupported ? 'medium' : null,
                            };
                            
                            return (
                              <div key={channel} className="flex items-start space-x-2">
                                <div className="mt-1">{getChannelIcon(channel)}</div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Switch 
                                      checked={currentState.enabled}
                                      onCheckedChange={(checked) => {
                                        setUserPreferences(prev => ({
                                          ...prev,
                                          [type.id]: {
                                            ...prev[type.id],
                                            [channel]: {
                                              ...currentState,
                                              enabled: checked,
                                            },
                                          },
                                        }));
                                      }}
                                      id={`user-${type.id}-${channel}`}
                                    />
                                    <Label htmlFor={`user-${type.id}-${channel}`} className="text-sm">
                                      {getChannelLabel(channel)}
                                    </Label>
                                  </div>
                                  {type.severitySupported && currentState.enabled && (
                                    <Select 
                                      value={currentState.minSeverity || 'low'} 
                                      onValueChange={(value) => {
                                        setUserPreferences(prev => ({
                                          ...prev,
                                          [type.id]: {
                                            ...prev[type.id],
                                            [channel]: {
                                              ...currentState,
                                              minSeverity: value,
                                            },
                                          },
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">All</SelectItem>
                                        <SelectItem value="medium">Medium+</SelectItem>
                                        <SelectItem value="high">High+</SelectItem>
                                        <SelectItem value="critical">Critical Only</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUserDialogOpen(false);
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedUserId) return;
                
                // Build preferences array from state
                const preferences: any[] = [];
                notificationTypes.forEach(type => {
                  ['email', 'in_app', 'sms', 'whatsapp'].forEach(channel => {
                    const state = userPreferences[type.id]?.[channel];
                    if (state !== undefined) {
                      preferences.push({
                        notificationTypeId: type.id,
                        channel,
                        enabled: state.enabled,
                        minSeverity: state.enabled && type.severitySupported ? state.minSeverity : null,
                      });
                    }
                  });
                });

                try {
                  const response = await apiRequest('PUT', `/api/admin/notification-preferences/${selectedUserId}`, {
                    preferences,
                  });
                  
                  if (response.ok) {
                    toast({ title: 'Success', description: 'Preferences updated successfully' });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-preferences'] });
                    setIsUserDialogOpen(false);
                    setSelectedUserId(null);
                  } else {
                    throw new Error('Failed to update preferences');
                  }
                } catch (error: any) {
                  toast({ 
                    title: 'Error', 
                    description: error.message || 'Failed to update preferences',
                    variant: 'destructive' 
                  });
                }
              }}
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
