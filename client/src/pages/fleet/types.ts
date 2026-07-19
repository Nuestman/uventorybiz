export type FleetUnitRow = {
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
  fleetOpsStatus?: string | null;
  vehicleKind?: "commute" | "mobile_store" | null;
};

/** @deprecated Prefer FleetUnitRow */
export type AmbulanceRow = FleetUnitRow;

export type FleetStockLine = {
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

/** @deprecated Prefer FleetStockLine */
export type AmbulanceStockLine = FleetStockLine;

export type FleetInventoryActivityRow = {
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

/** @deprecated Prefer FleetInventoryActivityRow */
export type AmbulanceInventoryActivityRow = FleetInventoryActivityRow;

export type FleetStockTransferRow = {
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

/** @deprecated Prefer FleetStockTransferRow */
export type AmbulanceStockTransferRow = FleetStockTransferRow;

export type FleetPrestartRow = {
  id: string;
  fleetLocationId: string;
  completedByUserId: string;
  shiftDate: string;
  checkedAt: string | null;
  status: string;
  responses: Record<string, unknown>;
  deficienciesNotes?: string | null;
  mileageReading?: string | null;
  fleetName: string;
  fleetOpsStatus?: string | null;
  completedByFirstName: string | null;
  completedByLastName: string | null;
};

/** @deprecated Prefer FleetPrestartRow */
export type AmbulancePrestartRow = FleetPrestartRow;

export type FleetOpsStatus = "available" | "deployed" | "standby" | "out_of_service";
