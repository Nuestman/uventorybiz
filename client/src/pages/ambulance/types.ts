export type AmbulanceRow = {
  id: string;
  locationName: string;
  locationCode: string;
  description?: string | null;
  status: string;
  locationKind: string;
  stationedAtLocationId?: string | null;
  stationedAtLocationName?: string | null;
  callSign?: string | null;
  registrationPlate?: string | null;
  fleetNumber?: string | null;
  coverageNotes?: string | null;
  ambulanceOpsStatus?: string | null;
};

export type AmbulanceStockLine = {
  stockLineId: string;
  itemName: string;
  itemCode: string;
  category: string | null;
  currentStock: number;
  minimumStock: number;
  unitOfMeasure: string | null;
  expiryDate: string | null;
  status: string | null;
  lowStock: boolean;
};

export type AmbulanceInventoryActivityRow = {
  id: string;
  transactionType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string | null;
  reason?: string | null;
  transactionDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  locationId?: string | null;
  counterpartyLocationId?: string | null;
  documentType?: string | null;
  documentId?: string | null;
  itemName?: string | null;
  itemCode?: string | null;
  createdByName?: string | null;
  locationName?: string | null;
  counterpartyLocationName?: string | null;
};

export type AmbulanceStockTransferRow = {
  id: string;
  status: string;
  type: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  direction: "in" | "out" | "both";
  createdAt: string | null;
  updatedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  itemCount: number;
};

export type AmbulancePrestartRow = {
  id: string;
  ambulanceLocationId: string;
  completedByUserId: string;
  shiftDate: string;
  checkedAt: string | null;
  status: string;
  responses: Record<string, boolean>;
  deficienciesNotes?: string | null;
  mileageReading?: string | null;
  ambulanceName: string;
  completedByFirstName: string | null;
  completedByLastName: string | null;
};
