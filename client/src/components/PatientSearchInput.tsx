import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Check } from "lucide-react";

interface Patient {
  id: string;          // patientId
  firstName: string;   // employee first name
  lastName: string;    // employee last name
  employeeId: string;  // employeeNumber
  department: string;
  status: string;
}

interface PatientSearchInputProps {
  onSelect: (patient: Patient) => void;
  selectedPatient?: Patient | null;
  placeholder?: string;
}

export default function PatientSearchInput({ 
  onSelect, 
  selectedPatient, 
  placeholder = "Search by name or employee ID..." 
}: PatientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const { data: searchResults = [] as Patient[], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { search: searchTerm }],
    enabled: searchTerm.length >= 2,
    retry: false,
  });

  useEffect(() => {
    if (selectedPatient) {
      setSearchTerm(`${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.employeeId})`);
      setShowResults(false);
    }
  }, [selectedPatient]);

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (!selectedPatient) {
      setShowResults(value.length >= 2);
    }
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    if (searchTerm.length >= 2 && !selectedPatient) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      if (!inputFocused) {
        setShowResults(false);
      }
    }, 200);
  };

  const handleSelectPatient = (patient: Patient) => {
    onSelect(patient);
    setSearchTerm(`${patient.firstName} ${patient.lastName} (${patient.employeeId})`);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setSearchTerm("");
    setShowResults(false);
    onSelect(null as any);
  };

  // API /api/patients returns rows like { patient, employee, company }.
  // Normalize to a simple Patient shape and apply the same search strategy
  // used in MedicalVisit: match on employee first/last name, employeeNumber, or patientId.
  const term = searchTerm.toLowerCase();
  const normalizedResults: Patient[] = (searchResults as any[]).map((row: any) => {
    const p = row?.patient ?? row ?? {};
    const e = row?.employee ?? {};
    return {
      id: p.id ?? "",
      firstName: e.firstName ?? "",
      lastName: e.lastName ?? "",
      employeeId: e.employeeNumber ?? "",
      department: e.department ?? "",
      status: p.status ?? "",
    };
  });

  const filteredResults = normalizedResults.filter((patient) => {
    if (!term) return true;
    const first = (patient.firstName || "").toLowerCase();
    const last = (patient.lastName || "").toLowerCase();
    const emp = (patient.employeeId || "").toLowerCase();
    const pid = (patient.id || "").toLowerCase();
    return (
      first.includes(term) ||
      last.includes(term) ||
      emp.includes(term) ||
      pid.includes(term)
    );
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-10 pr-10"
        />
        {selectedPatient && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClearSelection}
          >
            ×
          </Button>
        )}
      </div>

      {showResults && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Searching employees...
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="p-2">
              {filteredResults.map((patient: Patient) => (
                <div
                  key={patient.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center text-white text-sm font-medium">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {patient.employeeId} • {patient.department}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={patient.status === 'active' ? 'default' : 
                             patient.status === 'cleared' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {patient.status}
                    </Badge>
                    {selectedPatient?.id === patient.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No employees found matching "{searchTerm}"
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}