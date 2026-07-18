import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import MobileNav from "@/components/MobileNav";
import NewPatientModal from "@/components/modals/NewPatientModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Plus, Hospital, Building2, LayoutGrid, List, Eye, HeartPulse } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRole, formatDepartment, formatStatus, formatGender } from "@/lib/formatters";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { fetchPatientsOfflineFirst } from "@/lib/offlinePatients";

function patientHasHealthProfile(patient: {
  allergies?: string | null;
  medicalHistory?: string | null;
  medications?: string | null;
  disability?: string | null;
}) {
  return [patient.allergies, patient.medicalHistory, patient.medications, patient.disability].some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
}

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { isMultiLocation } = useActiveLocation();

  const { data: patients = [], isLoading } = useQuery<any[]>({
    queryKey: searchQuery ? ["/api/patients", { search: searchQuery }] : ["/api/patients"],
    queryFn: () => fetchPatientsOfflineFirst(searchQuery),
    retry: false,
  });

  // Fetch care locations
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isMultiLocation,
  });

  // Get unique departments and companies for filters
  const safePatients = Array.isArray(patients) ? patients : [];
  const uniqueDepartments = Array.from(new Set(safePatients.map((p: any) => p?.employee?.department).filter(Boolean)));
  const uniqueCompanies = Array.from(new Set(safePatients.map((p: any) => p?.company?.name).filter(Boolean)));

  // Filter patients
  const filteredPatients = safePatients.filter((patientData: any) => {
    if (!patientData) return false;
    const { patient, employee } = patientData;
    if (!patient) return false;
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee?.department === departmentFilter;
    const matchesCompany = companyFilter === 'all' || patientData.company?.name === companyFilter;
    const matchesLocation = locationFilter === 'all' || patientData.location?.id === locationFilter;
    
    return matchesStatus && matchesDepartment && matchesCompany && matchesLocation;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Patient Management</h2>
            <p className="text-mineaid-gray mt-1">Manage patient records and information</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button 
              className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
              onClick={() => setNewPatientModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Patient
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar and Location */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mineaid-gray" />
                  <Input
                    placeholder="Search patients by name or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isMultiLocation && (
                  <Select value={locationFilter || "all"} onValueChange={setLocationFilter}>
                    <SelectTrigger className="flex-1 min-w-[200px]">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {careLocations.map((location: any) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.locationCode} - {location.locationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="under_care">Under Care</SelectItem>
                    <SelectItem value="referred">Referred</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map((dept: any) => (
                      <SelectItem key={dept} value={dept}>{formatDepartment(dept)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {uniqueCompanies.map((company: any) => (
                      <SelectItem key={company} value={company}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          <span>{company}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDepartmentFilter("all");
                      setCompanyFilter("all");
                      setLocationFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                  
                  {/* View Toggle */}
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="rounded-r-none"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              All Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPatients && filteredPatients.length > 0 ? (
              viewMode === 'cards' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 xxl:grid-cols-3 gap-4">
                  {filteredPatients.map((patientData: any) => {
                    const { patient, employee, company } = patientData;
                    return (
                      <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0 card-hover-accent">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-mineaid-navy rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {employee?.firstName?.charAt(0) || 'U'}{employee?.lastName?.charAt(0) || 'N'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {employee?.firstName || 'Unknown'} {employee?.lastName || 'Employee'}
                            </p>
                            <p className="text-sm text-mineaid-gray truncate">Employee: {employee?.employeeNumber || 'N/A'}</p>
                            <p className="text-sm text-mineaid-gray truncate">Department: {formatDepartment(employee?.department)}</p>
                            <p className="text-sm text-mineaid-gray truncate">Position: {formatRole(employee?.position)}</p>
                            <p className="text-sm text-mineaid-gray truncate">Company: {company?.name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                          <Badge 
                            variant={patient.status === 'active' ? 'default' : 
                                   patient.status === 'cleared' ? 'secondary' : 'destructive'}
                            className="w-fit"
                          >
                            {formatStatus(patient.status)}
                          </Badge>
                          <Link href={`/patient/${patient.id}`}>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                              View
                            </Button>
                          </Link>
                          <Link href={`/medical-visit?patientId=${patient.id}`}>
                            <Button size="sm" className="bg-mineaid-navy hover:bg-mineaid-navy/90 w-full sm:w-auto">
                              New Visit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Table View
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Employee #</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Health profile</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patientData: any, index: number) => {
                      const { patient, employee, company } = patientData;
                      return (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-mineaid-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {employee?.firstName?.charAt(0) || 'U'}{employee?.lastName?.charAt(0) || 'N'}
                              </div>
                              <span className="font-medium">
                                {employee?.firstName || 'Unknown'} {employee?.lastName || 'Employee'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{employee?.employeeNumber || 'N/A'}</TableCell>
                          <TableCell>{formatDepartment(employee?.department)}</TableCell>
                          <TableCell>{formatRole(employee?.position)}</TableCell>
                          <TableCell>{formatGender(employee?.gender)}</TableCell>
                          <TableCell>{company?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {patientHasHealthProfile(patient) ? (
                              <Badge variant="outline" className="gap-1 font-normal">
                                <HeartPulse className="h-3 w-3" />
                                On file
                              </Badge>
                            ) : (
                              <span className="text-mineaid-gray text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={patient.status === 'active' ? 'default' : 
                                     patient.status === 'cleared' ? 'secondary' : 'destructive'}
                            >
                              {formatStatus(patient.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link href={`/patient/${patient.id}`}>
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/medical-visit?patientId=${patient.id}`}>
                                <Button size="sm" variant="ghost" className="text-blue-600">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                <p className="text-mineaid-gray mb-4">
                  {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || companyFilter !== 'all'
                    ? "No patients match your filter criteria" 
                    : "No patients have been registered yet"
                  }
                </p>
                <Button 
                  className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
                  onClick={() => setNewPatientModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register First Patient
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      <MobileNav />
      
      {/* Modals */}
      <NewPatientModal 
        open={newPatientModalOpen} 
        onOpenChange={setNewPatientModalOpen} 
      />
    </div>
  );
}
