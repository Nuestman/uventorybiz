# Location Filtering - Complete Implementation ✅

## Summary

Added location-based filtering to both the Inventory page and Medical Visits (Records page), allowing users to filter items and visits by care location.

---

## ✅ Complete Implementation

### 1. Inventory Page Location Filter

**File:** `client/src/pages/Inventory.tsx`

#### Added State:
```typescript
const [selectedLocation, setSelectedLocation] = useState<string>('all');
```

#### Fetch Care Locations:
```typescript
const { data: allCareLocations = [] } = useQuery({
  queryKey: ['/api/care-locations'],
  enabled: isMultiLocation, // Only fetch if tenant has multiple locations
});
```

#### Updated Query:
```typescript
const { data: inventory = [], isLoading } = useQuery<MedicalInventory[]>({
  queryKey: ['/api/inventory', { 
    category: selectedCategory, 
    status: selectedStatus, 
    location: selectedLocation,  // ✅ ADDED
    lowStock: showLowStock 
  }],
  queryFn: async () => {
    // ... add location to params
    if (selectedLocation && selectedLocation !== 'all') {
      params.append('locationId', selectedLocation);
    }
  }
});
```

#### UI Filter Dropdown:
```tsx
{isMultiLocation && allCareLocations.length > 0 && (
  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="All Locations" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Locations</SelectItem>
      {allCareLocations.map((loc: any) => (
        <SelectItem key={loc.id} value={loc.id}>
          <div className="flex items-center gap-2">
            <Hospital className="h-3 w-3" />
            <span>{loc.locationCode}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

---

### 2. Backend - Inventory Location Filter

**File:** `server/routes.ts` - Line 3372

#### Added locationId Parameter:
```typescript
const filters = {
  category: req.query.category as string,
  status: req.query.status as string,
  lowStock: req.query.lowStock === 'true',
  locationId: req.query.locationId as string  // ✅ ADDED
};
```

**File:** `server/storage.ts` - Lines 228, 2352, 2367-2369

#### Updated Interface:
```typescript
getMedicalInventoryList(
  tenantId: string, 
  filters?: { 
    category?: string; 
    status?: string; 
    lowStock?: boolean; 
    locationId?: string  // ✅ ADDED
  }
): Promise<MedicalInventory[]>;
```

#### Added Filter Logic:
```typescript
if (filters?.locationId) {
  conditions.push(eq(medicalInventory.locationId, filters.locationId));
}
```

---

### 3. Medical Visits Page Location Filter

**File:** `client/src/pages/Records.tsx`

#### Added Imports:
```typescript
import { Hospital } from "lucide-react";
import { useActiveLocation } from "@/hooks/useActiveLocation";
```

#### Added State:
```typescript
const [visitLocationFilter, setVisitLocationFilter] = useState("all");
const { isMultiLocation } = useActiveLocation();
```

#### Fetch Care Locations:
```typescript
const { data: careLocations = [] } = useQuery({
  queryKey: ['/api/care-locations'],
  enabled: isMultiLocation,
});
```

#### Updated Filter Logic:
```typescript
const filteredMedicalVisits = medicalVisits.filter((visit: any) => {
  const matchesSearch = !visitSearchTerm || ...;
  const matchesStatus = visitStatusFilter === 'all' || ...;
  const matchesType = visitTypeFilter === 'all' || ...;
  const matchesLocation = visitLocationFilter === 'all' || 
    visit.location?.id === visitLocationFilter;  // ✅ ADDED
  
  return matchesSearch && matchesStatus && matchesType && matchesLocation;
});
```

#### UI Filter Dropdown:
```tsx
{isMultiLocation && careLocations.length > 0 && (
  <Select value={visitLocationFilter} onValueChange={setVisitLocationFilter}>
    <SelectTrigger>
      <SelectValue placeholder="Filter by location" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Locations</SelectItem>
      {careLocations.map((loc: any) => (
        <SelectItem key={loc.id} value={loc.id}>
          <div className="flex items-center gap-2">
            <Hospital className="h-3 w-3" />
            <span>{loc.locationCode}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

#### Updated Clear Filters:
```typescript
onClick={() => {
  setVisitStatusFilter("all");
  setVisitTypeFilter("all");
  setVisitLocationFilter("all");  // ✅ ADDED
  setVisitSearchTerm("");
}}
```

---

## 🎨 Visual UI

### Inventory Filters:
```
┌───────────────────────────────────────────────────────────────────┐
│ 🔍 [Search items...]  [All Categories ▼] [All Status ▼]         │
│                                                                    │
│ [🏥 All Locations ▼]  [⚠️ Low Stock Only]                       │
│                                                                    │
│ Options in dropdown:                                               │
│   All Locations                                                    │
│   🏥 CLINIC-01                                                    │
│   🏥 CLINIC-02                                                    │
│   🏥 ODDFAP                                                       │
└───────────────────────────────────────────────────────────────────┘
```

### Medical Visits Filters:
```
┌───────────────────────────────────────────────────────────────────┐
│ 🔍 [Search visits...]                                             │
│                                                                    │
│ [All Statuses ▼]  [All Types ▼]  [🏥 All Locations ▼]          │
│                                                                    │
│ [Clear Filters]                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 How It Works

### Inventory Page:
```
1. User selects location from dropdown
   └─→ Query updates with locationId parameter
       └─→ Backend filters inventory by locationId
           └─→ Only items at selected location shown ✅
```

### Medical Visits Page:
```
1. User selects location from dropdown
   └─→ Frontend filters visits array
       └─→ Only visits at selected location shown ✅
```

---

## 🔍 Filtering Logic

### Inventory (Backend):
```typescript
// In storage.ts
if (filters?.locationId) {
  conditions.push(eq(medicalInventory.locationId, filters.locationId));
}

// SQL: WHERE location_id = 'selected-location-id'
```

### Medical Visits (Frontend):
```typescript
const matchesLocation = visitLocationFilter === 'all' || 
  visit.location?.id === visitLocationFilter;
```

---

## 💡 Smart UI

### Single-Location Tenants:
- ✅ Location filter **not shown** (no need)
- ✅ Cleaner UI without unnecessary filter

### Multi-Location Tenants:
- ✅ Location filter **shown**
- ✅ Populated with all care locations
- ✅ Can filter by specific location
- ✅ Can view "All Locations"

---

## 📊 Files Modified

| File | Changes | Status |
|------|---------|--------|
| `client/src/pages/Inventory.tsx` | Added location filter state, query, UI | ✅ |
| `server/routes.ts` | Added locationId to filters | ✅ |
| `server/storage.ts` | Added locationId filter logic + interface | ✅ |
| `client/src/pages/Records.tsx` | Added location filter state, logic, UI | ✅ |

---

## 🧪 Testing Guide

### Test 1: Inventory Location Filter
```
1. Go to /inventory
2. Expected: If multi-location, see location dropdown ✅
3. Select a specific location
4. Expected: Only items at that location shown ✅
5. Select "All Locations"
6. Expected: All items shown ✅
```

### Test 2: Medical Visits Location Filter
```
1. Go to /records (Medical Visits tab)
2. Expected: If multi-location, see location dropdown ✅
3. Select a specific location
4. Expected: Only visits at that location shown ✅
5. Click "Clear Filters"
6. Expected: Location reset to "All Locations" ✅
```

### Test 3: Single-Location Tenant
```
1. Ensure tenant has only one location
2. Go to /inventory and /records
3. Expected: Location filter NOT shown ✅
4. Works normally without location filter ✅
```

### Test 4: Combined Filters
```
1. On /inventory:
   - Category: Equipment
   - Status: Active
   - Location: CLINIC-01
   - Low Stock: ON
2. Expected: Only active equipment at CLINIC-01 with low stock ✅
```

---

## 🎉 Result

**Location filtering now available on:**
1. ✅ **Inventory Page** - Backend filtering via API
2. ✅ **Medical Visits Page** - Frontend filtering

**Users can now:**
- ✅ View items/visits for specific locations
- ✅ View all locations combined
- ✅ Combine location filter with other filters
- ✅ Clear all filters at once

**Smart UI:**
- ✅ Only shows for multi-location tenants
- ✅ Dropdown with all care locations
- ✅ Hospital icon for visual clarity
- ✅ Consistent design across pages

---

**Date:** October 10, 2025  
**Feature:** Location-based filtering for Inventory and Medical Visits  
**Status:** ✅ COMPLETE  
**Result:** Users can now filter by care location! 🏥

