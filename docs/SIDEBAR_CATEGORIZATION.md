# Sidebar Categorization & Navigation

**Version**: 1.0.0 | **Last Updated**: January 2025

## Overview

The sidebar navigation has been reorganized into logical groups with dropdown functionality for better UX and scalability. All navigation items are type-safe, RBAC-enabled, and support tab navigation for pages with multiple tabs.

## Architecture

### Type Safety

All sidebar items are defined using TypeScript interfaces in `client/src/types/sidebar.ts`:

- `SidebarNavItem`: Base navigation item with URL, icon, description, and optional RBAC
- `SidebarGroupConfig`: Group of items with label, icon, and dropdown configuration
- `TabNavigationItem`: Tab navigation for pages with multiple tabs
- `SidebarItemRBAC`: Role-based access control requirements

### Configuration

Sidebar configuration is centralized in `client/src/config/sidebarConfig.tsx`. This makes it easy to:
- Add new navigation items
- Reorganize groups
- Update RBAC requirements
- Add tab navigation

## Sidebar Groups

### 1. Healthcare Management

**Purpose**: Core patient and medical care functionality

**Items**:
- Dashboard (`/`)
- Patients (`/patients`)
- Medical Visits (`/medical-visit`)
- Records (`/records`) - *Has tab navigation*
  - Medical Visits
  - Patients
  - Appointment History
  - Assignment History
- Incidents (`/incidents`)

**Access**: All authenticated users

### 2. Operations

**Purpose**: Operational tasks, scheduling, and assignments

**Items**:
- Appointments (`/appointments`)
- Operational Duties (`/operational-duties`)
- Assignment History (`/assignment-history`) - *Has tab navigation*
  - Assignment History
  - Analytics & Reports

**Access**: All authenticated users

### 3. Testing

**Purpose**: Drug, Alcohol & Hydration testing functionality

**Items**:
- Testing Overview (`/testing`) - *Has tab navigation*
  - Tests
  - Scheduled
  - Programs
  - Equipment
- New Test (`/testing/new`)
- Test Scheduling (`/testing/schedule`)
- Reports & Analytics (`/testing/reports`) - *Has tab navigation*
  - Overview
  - Drug Tests
  - Alcohol Tests
  - Hydration Tests
  - Compliance

**Access**: All authenticated users

### 4. Inventory Management

**Purpose**: Medical inventory, supplies, and equipment tracking

**Items**:
- Inventory Overview (`/inventory`)
- Transactions (`/inventory-transactions`)
- Purchase Orders (`/purchase-orders`)
- Transaction History (`/transaction-history`)
- Equipment Tracking (`/equipment-tracking`)

**Access**: All authenticated users

### 5. Administration

**Purpose**: Admin and super admin functionality

**Items**:
- Admin Panel (`/admin`) - *Has tab navigation*
  - Users
  - Employees
  - Companies
  - Locations
  - Notifications
  - Audit Trail
  - **RBAC**: Requires `admin` role with `tenantId`
  
- Super Admin (`/super-admin`) - *Has tab navigation*
  - Tenant Organizations
  - Tenant Administrators
  - All Users
  - API Testing
  - **RBAC**: Requires `super_admin` role with no `tenantId`

**Access**: Role-based (see RBAC section)

### 6. Resources

**Purpose**: Documentation and help resources

**Items**:
- Documentation (`/docs`)

**Access**: All authenticated users

## RBAC (Role-Based Access Control)

### Role Hierarchy

1. `medical_staff` - Basic access
2. `safety_officer` - Safety-focused access
3. `admin` - Tenant administration (requires `tenantId`)
4. `super_admin` - Platform administration (requires no `tenantId`)

### RBAC Rules

Items can specify:
- `minRole`: Minimum role required
- `allowedRoles`: Specific roles that can access
- `requiresTenant`: User must have a `tenantId`
- `requiresNoTenant`: User must NOT have a `tenantId`

### Filtering

The `getFilteredSidebarGroups()` function automatically filters sidebar items based on:
- User role
- User tenant status
- Item RBAC requirements

## Tab Navigation

### How It Works

Pages with tabs can expose tab navigation in the sidebar. When a user clicks a tab link in the sidebar:

1. The page URL is navigated to with a hash (e.g., `/records#patients`)
2. A custom event `sidebar-tab-navigate` is dispatched
3. The page component listens for this event and activates the corresponding tab

### Adding Tab Navigation to a Page

1. **Define tabs in sidebar config** (`client/src/config/sidebarConfig.tsx`):

```typescript
const myPageTabs: TabNavigationItem[] = [
  { value: "tab1", title: "Tab 1", urlHash: "#tab1" },
  { value: "tab2", title: "Tab 2", urlHash: "#tab2" },
];

// Add to the item
{
  title: "My Page",
  url: "/my-page",
  icon: MyIcon,
  tabs: myPageTabs,
}
```

2. **Listen for navigation in the page component**:

```typescript
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function MyPage() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("tab1");

  useEffect(() => {
    // Listen for sidebar tab navigation
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail.tabValue);
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    
    // Check URL hash on mount
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveTab(hash);
    }

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    };
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* Tab content */}
    </Tabs>
  );
}
```

## Adding New Navigation Items

### Step 1: Add to Configuration

Edit `client/src/config/sidebarConfig.tsx`:

```typescript
const myNewGroup: SidebarGroupConfig = {
  label: "My New Group",
  icon: MyIcon,
  isDropdown: true,
  items: [
    {
      title: "New Item",
      url: "/new-item",
      icon: ItemIcon,
      description: "Item description",
      // Optional RBAC
      rbac: {
        minRole: "admin",
        requiresTenant: true,
      },
      // Optional tabs
      tabs: [
        { value: "tab1", title: "Tab 1", urlHash: "#tab1" },
      ],
    },
  ],
};

// Add to sidebarConfig array
export const sidebarConfig: SidebarGroupConfig[] = [
  // ... existing groups
  myNewGroup,
];
```

### Step 2: Add Route (if needed)

Add the route in `client/src/App.tsx`:

```typescript
<Route path="/new-item" component={NewItemPage} />
```

### Step 3: Test RBAC

Ensure the item only appears for users with the correct role and tenant status.

## Best Practices

1. **Grouping**: Group related items together logically
2. **Naming**: Use clear, descriptive labels
3. **Icons**: Use consistent icons from `lucide-react`
4. **RBAC**: Always specify RBAC requirements for admin/super admin items
5. **Tabs**: Add tab navigation for pages with multiple tabs
6. **Ordering**: Order groups by importance and user workflow

## Migration Notes

### From Old Structure

The old sidebar structure used separate arrays for different item types:
- `navigationItems`
- `inventoryItems`
- `testingItems`
- `adminItems`
- `superAdminItems`

All items are now consolidated in `sidebarConfig.tsx` with proper grouping and RBAC.

### Breaking Changes

- Appointments moved from "Navigation" to "Operations" group
- Resources is now a dropdown (even with one item, for consistency)
- All groups are now dropdowns by default
- Tab navigation must be explicitly added to pages

## Future Enhancements

- [ ] Search functionality across all sidebar items
- [ ] Customizable sidebar order (user preferences)
- [ ] Keyboard navigation support
- [ ] Breadcrumb integration
- [ ] Analytics tracking for navigation
