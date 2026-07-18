import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";

interface PatientSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function PatientSelect({ value, onValueChange, placeholder = "Select a patient..." }: PatientSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  type PatientData = {
    patient: { id: string };
    employee?: {
      firstName?: string;
      lastName?: string;
      employeeNumber?: string;
    };
  };

  const { data: patients = [] as PatientData[], isLoading } = useQuery<PatientData[]>({
    queryKey: searchQuery ? ["/api/patients", { search: searchQuery }] : ["/api/patients"],
    retry: false,
  });

  const filteredPatients = patients.filter((patientData: PatientData) => {
    if (!searchQuery) return true;
    const { patient, employee } = patientData;
    const searchLower = searchQuery.toLowerCase();
    return (
      employee?.firstName?.toLowerCase().includes(searchLower) ||
      employee?.lastName?.toLowerCase().includes(searchLower) ||
      employee?.employeeNumber?.toLowerCase().includes(searchLower) ||
      patient?.id?.toLowerCase().includes(searchLower)
    );
  });

  const selectedPatient = patients.find((patientData: PatientData) => patientData.patient.id === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search patients by name or employee ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={value} onValueChange={onValueChange} open={isOpen} onOpenChange={setIsOpen}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedPatient && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>
                  {selectedPatient.employee?.firstName} {selectedPatient.employee?.lastName}
                  {selectedPatient.employee?.employeeNumber && (
                    <span className="text-mineaid-gray ml-1">
                      ({selectedPatient.employee.employeeNumber})
                    </span>
                  )}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {isLoading ? (
            <div className="p-4 text-center text-mineaid-gray">
              <div className="animate-spin h-4 w-4 border-2 border-mineaid-navy border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading patients...
            </div>
          ) : filteredPatients.length > 0 ? (
            filteredPatients.map((patientData: any) => {
              const { patient, employee, company } = patientData;
              return (
                <SelectItem key={patient.id} value={patient.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-mineaid-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {employee?.firstName?.charAt(0) || 'U'}{employee?.lastName?.charAt(0) || 'N'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee?.firstName || 'Unknown'} {employee?.lastName || 'Employee'}
                        </p>
                        <p className="text-xs text-mineaid-gray">
                          {employee?.employeeNumber || 'N/A'} • {employee?.department || 'N/A'}
                        </p>
                        {company?.name && (
                          <p className="text-xs text-mineaid-gray">{company.name}</p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={patient.status === 'active' ? 'default' : 
                             patient.status === 'cleared' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {patient.status}
                    </Badge>
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <div className="p-4 text-center text-mineaid-gray">
              {searchQuery ? 'No patients match your search' : 'No patients found'}
            </div>
          )}
        </SelectContent>
      </Select>

      {searchQuery && filteredPatients.length === 0 && !isLoading && (
        <p className="text-sm text-mineaid-gray">
          No patients found matching "{searchQuery}". Try a different search term.
        </p>
      )}
    </div>
  );
}