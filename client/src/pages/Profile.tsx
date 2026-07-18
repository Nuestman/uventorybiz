import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useRoute } from 'wouter';

import MobileNav from '@/components/MobileNav';
import MfaProfileCard from '@/components/MfaProfileCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera, Save, ArrowLeft, Upload, Building2, Mail, Phone, Shield, Briefcase, CheckCircle, XCircle, Clock, Calendar, UserCheck, AlertCircle, Info, KeyRound } from 'lucide-react';
import { Link } from 'wouter';
import { formatRole, formatDepartment, formatStatus } from '@/lib/formatters';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SimpleFileUploader } from '@/components/SimpleFileUploader';

// Profile update schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileUpdateSchema>;

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [match, params] = useRoute('/profile/:userId');
  const userId = params?.userId;
  const isViewingOtherUser = userId && userId !== currentUser?.id;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch user data (with employee & company) when we have a target user id
  const effectiveUserId = userId || currentUser?.id;
  const { data: fetchedUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/users', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      console.log('[Profile] Fetching user data for:', effectiveUserId);
      const response = await apiRequest('GET', `/api/users/${effectiveUserId}`);
      const data = await response.json();
      console.log('[Profile] Fetched user data:', {
        id: data?.id,
        email: data?.email,
        hasEmployee: !!data?.employee,
        hasCompany: !!data?.company,
        employeeId: data?.employee?.id,
        companyId: data?.employee?.companyId,
        companyName: data?.company?.name,
      });
      return data;
    },
    enabled: !!effectiveUserId,
  });
  
  // Prefer fetched user (includes company/employee), fall back to auth user
  const user = fetchedUser || currentUser;
  const canEdit = !isViewingOtherUser; // Only allow editing own profile
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: String(user?.firstName || ''),
      lastName: String(user?.lastName || ''),
      email: String(user?.email || ''),
      phoneNumber: (user?.phoneNumber as string) || '',
      bio: (user?.bio as string) || '',
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: String(user.firstName || ''),
        lastName: String(user.lastName || ''),
        email: String(user.email || ''),
        phoneNumber: (user.phoneNumber as string) || '',
        bio: (user.bio as string) || '',
      });
    }
  }, [user, form]);

  // Profile image upload mutation using object storage
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (imageURL: string) => {
      const response = await apiRequest('PUT', '/api/profile/picture', {
        imageURL,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile picture',
        variant: 'destructive',
      });
    },
  });

  // Profile update mutation  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Map phoneNumber to phone for API
      const { phoneNumber, ...rest } = data;
      const response = await apiRequest('PUT', '/api/profile', {
        ...rest,
        phone: phoneNumber,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      if (effectiveUserId) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', effectiveUserId] });
      }
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const text = await res.text();
      let parsed: { message?: string } | null = null;
      if (text.trim()) {
        try {
          parsed = JSON.parse(text) as { message?: string };
        } catch {
          throw new Error(
            'Server returned an invalid response. If you just updated the app, restart the dev server (npm run dev).',
          );
        }
      }
      if (!res.ok) {
        throw new Error(parsed?.message ?? `Password change failed (${res.status})`);
      }
      return parsed;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChangeFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Handle profile picture upload completion
  const handleUploadComplete = (uploadUrl: string) => {
    console.log('Upload completed, file URL:', uploadUrl);
    uploadProfileImageMutation.mutate(uploadUrl);
  };

  // Debug: Log user profile picture
  console.log('[Profile] Current user profile picture:', user?.profileImageUrl);
  console.log('[Profile] Effective user data:', {
    id: (user as any)?.id,
    email: (user as any)?.email,
    employeeId: (user as any)?.employeeId,
    companyFromUser: (user as any)?.company,
    employeeFromUser: (user as any)?.employee,
    employeeCompanyId: (user as any)?.employee?.companyId,
    companyName: (user as any)?.company?.name,
    isFetchedUser: !!fetchedUser,
    isCurrentUser: !fetchedUser,
  });

  if (isViewingOtherUser && isLoadingUser) {
    return (
      <div className="min-h-screen bg-uventorybiz-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uventorybiz-navy mx-auto mb-4"></div>
          <p className="text-uventorybiz-gray">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (isViewingOtherUser && !fetchedUser && !isLoadingUser) {
    return (
      <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <Link href="/admin">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex gap-3 sm:gap-4">
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{isViewingOtherUser ? "Back" : "Back"}</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {isViewingOtherUser ? `${user?.firstName} ${user?.lastName}'s Profile` : 'My Profile'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-sm sm:text-base text-uventorybiz-gray">
                    {isViewingOtherUser ? 'User account information' : 'Manage your account information'}
                  </p>
                  {user?.lastLoginAt && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Last active {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {!isEditing && canEdit && (
              <Button 
                onClick={() => setIsEditing(true)} 
                className="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90 shrink-0 w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile Picture & Quick Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Picture Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-lg">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt="Profile"
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl sm:text-4xl bg-gradient-to-br from-uventorybiz-navy to-blue-700 text-white">
                      {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || 'N'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <p className="text-sm text-gray-600">{formatRole(user?.role)}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant="outline" className={
                        user?.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        user?.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        user?.status === 'blocked' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }>
                        {formatStatus(user?.status || 'pending')}
                      </Badge>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <SimpleFileUploader
                      onUploadComplete={handleUploadComplete}
                      buttonText="Update Photo"
                      buttonClassName="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90 text-white text-sm"
                      accept="image/*"
                      maxSizeMB={5}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company
                    </span>
                    <span className="text-sm font-medium text-right">
                      {(user as any)?.company?.name ||
                        (user as any)?.employee?.company?.name ||
                        'N/A'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Department
                    </span>
                    <span className="text-sm font-medium text-right">
                      {formatDepartment((user as any)?.employee?.department as string | null | undefined) || 'N/A'}
                    </span>
                  </div>
                  {user?.lastLoginAt && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Last Active
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(user.lastLoginAt), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(user.lastLoginAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        First Name
                      </Label>
                      <p className="text-lg font-medium">{user?.firstName || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Last Name
                      </Label>
                      <p className="text-lg font-medium">{user?.lastName || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-medium">{user?.email || 'Not provided'}</p>
                        {user?.isEmailVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </Label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-medium">{(user?.phoneNumber as string) || 'Not provided'}</p>
                        {user?.isPhoneVerified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Role
                      </Label>
                      <p className="text-lg font-medium">{formatRole(user?.role)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Status
                      </Label>
                      <Badge variant="outline" className={
                        user?.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        user?.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        user?.status === 'blocked' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }>
                        {formatStatus(user?.status || 'pending')}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Department
                      </Label>
                      <p className="text-lg font-medium">
                        {formatDepartment((user as any)?.employee?.department as string | null | undefined) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company
                      </Label>
                      <p className="text-lg font-medium">
                        {(user as any)?.company?.name ||
                          (user as any)?.employee?.company?.name ||
                          'Not provided'}
                      </p>
                    </div>
                  </div>
                  
                  {user && (user.bio as string) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Bio
                      </Label>
                      <p className="text-base mt-1">{user.bio as string}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us a bit about yourself..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          className="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90 flex-1 sm:flex-initial"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsEditing(false);
                            form.reset();
                          }}
                          className="flex-1 sm:flex-initial"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <KeyRound className="h-5 w-5" />
                    Password & Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90 w-full sm:w-auto"
                        >
                          {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Employee Information - Show if employee exists */}
            {(user as any)?.employee && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Briefcase className="h-5 w-5" />
                    Employee Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Employee Number
                    </Label>
                    <p className="text-lg font-medium">{(user as any).employee.employeeNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Position
                    </Label>
                    <p className="text-lg font-medium">{(user as any).employee.position || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Title
                    </Label>
                    <p className="text-lg font-medium">{(user as any).employee.jobTitle || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Hire Date
                    </Label>
                    <p className="text-lg font-medium">
                      {(user as any).employee.hireDate 
                        ? new Date((user as any).employee.hireDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  {(user as any).employee.emergencyContactName && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Emergency Contact
                        </Label>
                        <p className="text-lg font-medium">{(user as any).employee.emergencyContactName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Emergency Phone
                        </Label>
                        <p className="text-lg font-medium">{(user as any).employee.emergencyContactPhone || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

            {/* Account Information - Show for admin view */}
            {isViewingOtherUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Info className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        Account Created
                      </Label>
                      <div>
                        <p className="text-base font-medium">
                          {user?.createdAt 
                            ? format(new Date(user.createdAt), 'MMM dd, yyyy')
                            : 'N/A'}
                        </p>
                        {user?.createdAt && (
                          <p className="text-sm text-gray-500 mt-1">
                            {format(new Date(user.createdAt), 'h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        Last Login
                      </Label>
                      <div>
                        <p className="text-base font-medium">
                          {user?.lastLoginAt 
                            ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy')
                            : 'Never'}
                        </p>
                        {user?.lastLoginAt && (
                          <p className="text-sm text-gray-500 mt-1">
                            {format(new Date(user.lastLoginAt), 'h:mm a')} • {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                    {user?.approvedBy && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4" />
                            Approved By
                          </Label>
                          <p className="text-base font-medium">{user.approvedBy}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4" />
                            Approved At
                          </Label>
                          <div>
                            <p className="text-base font-medium">
                              {user.approvedAt 
                                ? format(new Date(user.approvedAt), 'MMM dd, yyyy')
                                : 'N/A'}
                            </p>
                            {user.approvedAt && (
                              <p className="text-sm text-gray-500 mt-1">
                                {format(new Date(user.approvedAt), 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4" />
                        Auth Provider
                      </Label>
                      <p className="text-base font-medium capitalize">{(user as any)?.authProvider || 'Custom'}</p>
                    </div>
                    <Separator className="col-span-1 sm:col-span-2" />
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4" />
                        User ID
                      </Label>
                      <p className="text-xs sm:text-sm font-mono text-gray-600 break-all bg-gray-50 p-2 rounded border">{user?.id}</p>
                    </div>
                    {(user as any)?.employeeId && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4" />
                          Employee ID
                        </Label>
                        <p className="text-xs sm:text-sm font-mono text-gray-600 break-all bg-gray-50 p-2 rounded border">{(user as any).employeeId}</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
            )}

            {user?.tenantId && <MfaProfileCard />}
          </div>
        </div>
      <MobileNav />
    </div>
  );
}