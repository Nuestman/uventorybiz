// Data formatters for consistent display across the app

export function formatRole(role: string | null | undefined): string {
  if (!role) return 'N/A';
  
  const roleMap: { [key: string]: string } = {
    'fleet_operator': 'Fleet operator',
    'staff': 'Staff',
    'operations': 'Operations',
    'admin': 'Admin',
    'super_admin': 'Super admin',
    'administrator': 'Administrator',
    'nurse': 'Nurse',
    'doctor': 'Doctor',
    'paramedic': 'Paramedic',
    'emergency_responder': 'Emergency Responder',
    'safety_coordinator': 'Safety Coordinator',
    'site_manager': 'Site Manager',
    'hr_manager': 'HR Manager',
    'operations_manager': 'Operations Manager',
    'mine_supervisor': 'Mine Supervisor',
    'equipment_operator': 'Equipment Operator',
    'maintenance_technician': 'Maintenance Technician',
    'engineer': 'Engineer',
    'geologist': 'Geologist',
    'environmental_officer': 'Environmental Officer',
    'security_officer': 'Security Officer'
  };
  
  return roleMap[role.toLowerCase()] || toTitleCase(role);
}

export function formatDepartment(department: string | null | undefined): string {
  if (!department) return 'N/A';
  
  const departmentMap: { [key: string]: string } = {
    'sales': 'Sales',
    'warehouse': 'Warehouse',
    'operations': 'Operations',
    'maintenance': 'Maintenance',
    'administration': 'Administration',
    'engineering': 'Engineering',
    'geology': 'Geology',
    'environmental': 'Environmental',
    'security': 'Security',
    'human_resources': 'Human Resources',
    'finance': 'Finance',
    'logistics': 'Logistics',
    'quality_control': 'Quality Control',
    'training': 'Training',
    'emergency_response': 'Emergency Response'
  };
  
  return departmentMap[department.toLowerCase()] || toTitleCase(department);
}

export function formatCompanyType(type: string | null | undefined): string {
  if (!type) return 'N/A';
  
  const typeMap: { [key: string]: string } = {
    'mother_company': 'Mother Company',
    'contractor': 'Contractor',
    'subcontractor': 'Subcontractor',
    'mining_company': 'Mining Company',
    'service_provider': 'Service Provider',
    'consultant': 'Consultant',
    'supplier': 'Supplier'
  };
  
  return typeMap[type.toLowerCase()] || toTitleCase(type);
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'N/A';
  
  const statusMap: { [key: string]: string } = {
    'active': 'Active',
    'inactive': 'Inactive',
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'suspended': 'Suspended',
    'terminated': 'Terminated',
    'on_leave': 'On Leave',
    'medical_leave': 'Medical Leave',
    'emergency_contact': 'Emergency Contact'
  };
  
  return statusMap[status.toLowerCase()] || toTitleCase(status);
}

export function formatGender(gender: string | null | undefined): string {
  if (!gender) return 'N/A';
  
  const genderMap: { [key: string]: string } = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other'
  };
  
  return genderMap[gender.toLowerCase()] || toTitleCase(gender);
}

export function formatWorkDisposition(disposition: string | null | undefined): string {
  if (!disposition) return 'N/A';
  
  const dispositionMap: { [key: string]: string } = {
    'return_to_work': 'Return to Work',
    'transferred_to_hospital': 'Transferred to Hospital',
    'transferred_to_hospital_other': 'Transferred to Hospital (Other)',
    'light_duty': 'Light Duty',
    'off_duty': 'Off Duty',
    'refer_to_specialist': 'Refer to Specialist',
    'emergency': 'Emergency',
    'follow_up_required': 'Follow-up Required',
    'no_restrictions': 'No Restrictions',
    'restricted_duty': 'Restricted Duty'
  };
  
  return dispositionMap[disposition.toLowerCase()] || toTitleCase(disposition);
}

export function formatIncidentType(type: string | null | undefined): string {
  if (!type) return 'N/A';
  
  const typeMap: { [key: string]: string } = {
    'injury': 'Injury',
    'near_miss': 'Near Miss',
    'equipment_failure': 'Equipment Failure',
    'environmental': 'Environmental',
    'security': 'Security',
    'fire': 'Fire',
    'explosion': 'Explosion',
    'chemical_spill': 'Chemical Spill',
    'fall': 'Fall',
    'struck_by': 'Struck By',
    'caught_between': 'Caught Between',
    'electrical': 'Electrical',
    'respiratory': 'Respiratory',
    'heat_related': 'Heat Related',
    'vehicle_accident': 'Vehicle Accident'
  };
  
  return typeMap[type.toLowerCase()] || toTitleCase(type);
}

export function formatSeverity(severity: string | null | undefined): string {
  if (!severity) return 'N/A';
  
  const severityMap: { [key: string]: string } = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical',
    'minor': 'Minor',
    'major': 'Major',
    'catastrophic': 'Catastrophic'
  };
  
  return severityMap[severity.toLowerCase()] || toTitleCase(severity);
}

export function formatPriority(priority: string | null | undefined): string {
  if (!priority) return 'N/A';
  
  const priorityMap: { [key: string]: string } = {
    'low': 'Low',
    'medium': 'Medium', 
    'high': 'High',
    'urgent': 'Urgent',
    'emergency': 'Emergency',
    'routine': 'Routine',
    'immediate': 'Immediate'
  };
  
  return priorityMap[priority.toLowerCase()] || toTitleCase(priority);
}

// Helper function to convert snake_case or kebab-case to Title Case
function toTitleCase(str: string): string {
  return str
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Format encounter type (canonical)
export function formatVisitType(type: string | null | undefined): string {
  if (!type) return "N/A";
  const map: Record<string, string> = {
    monitoring: "Monitoring",
    procedure: "Procedure",
    clinical: "Standard visit",
    injury: "Injury",
    screening: "Screening",
    follow_up: "Follow-up",
  };
  return map[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @deprecated alias */
export const formatEncounterType = formatVisitType;

export function formatEncounterStatus(status: string | null | undefined): string {
  if (!status) return "N/A";
  const map: Record<string, string> = {
    planned: "Scheduled",
    arrived: "Arrived",
    triaged: "Triaged",
    in_progress: "In progress",
    finished: "Discharged",
    cancelled: "Cancelled",
    entered_in_error: "Entered in error",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

// Format appointment status
export function formatAppointmentStatus(status: string | null | undefined): string {
  if (!status) return 'N/A';
  
  const statusMap: { [key: string]: string } = {
    'scheduled': 'Scheduled',
    'confirmed': 'Confirmed',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'no_show': 'No Show',
    'rescheduled': 'Rescheduled'
  };
  
  return statusMap[status.toLowerCase()] || toTitleCase(status);
}