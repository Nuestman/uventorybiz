# View Toggle - Quick User Guide 📊

## Toggle Between Cards and Table Views

Both `/patients` and `/incidents` pages now support two viewing modes!

---

## 🔲 Cards View (Default)

### Best For:
- Detailed information display
- Mobile devices
- Visual scanning
- Less technical users

### Patients Cards:
```
┌────────────────────────────────────┐
│ JD  John Doe            [Active]   │
│     Employee: EMP123               │
│     Department: Operations         │
│     Position: Operator             │
│     Company: MineAid Corp          │
│              [View] [New Visit]    │
└────────────────────────────────────┘
```

### Incidents Cards:
```
┌────────────────────────────────────┐
│ ⚠️  Personal Injury    [Major]     │
│     John Doe • Operator  [Open]    │
│                                     │
│ 📅 Oct 10  📍 Mine A  🏥 FAP-01   │
│ Description preview...              │
│ [On-Site] [Ambulance]  [View] [...] │
└────────────────────────────────────┘
```

---

## ☰ Table View

### Best For:
- Quick scanning
- Large datasets
- Desktop screens
- Finding specific records
- Data comparison

### Patients Table:
```
# | Patient Name | Emp # | Dept   | Position | Company | Status | Actions
--+--------------+-------+--------+----------+---------+--------+--------
1 | JD John Doe  | 123   | Ops    | Operator | Corp    | Active | 👁 +
2 | JS Jane Smit | 124   | Safety | Officer  | Corp    | Active | 👁 +
3 | BD Bob Davis | 125   | Maint  | Tech     | Corp    | Cleared| 👁 +
```

### Incidents Table:
```
# | Type     | Patient  | Date    | Location | Severity | Status | Actions
--+----------+----------+---------+----------+----------+--------+--------
1 | Injury   | John Doe | Oct 10  | Mine A   | Major    | Open   | 👁 ⋮
2 | Near Miss| Jane S.  | Oct 09  | Mine B   | Minor    | Closed | 👁 ⋮
3 | Chemical | Bob D.   | Oct 08  | Mine C   | Moderate | Open   | 👁 ⋮
```

---

## 🎮 How to Use

### Switch Views:
1. Look for toggle buttons next to "Clear Filters"
2. Click **🔲** for Cards View
3. Click **☰** for Table View
4. **Active view is highlighted**

### Visual Indicator:
```
[Clear Filters] [🔲|☰]
                 ↑  ↑
              Active Inactive
```

---

## ⚡ Quick Tips

1. **Filters work in both views** - Apply filters, then switch view
2. **View persists** - Your selection stays while filtering
3. **All actions available** - View, Edit, Delete work in both views
4. **Responsive** - Cards better on mobile, table on desktop

---

## 📊 When to Use Each View

### Use Cards When:
- 📱 On mobile device
- 🔍 Reviewing individual records carefully
- 👥 Showing to non-technical users
- 📄 Need to see more context at once

### Use Table When:
- 💻 On desktop/large screen
- ⚡ Need to scan many records quickly
- 🔢 Looking for specific values
- 📊 Comparing multiple records
- 📝 Data entry/verification work

---

## ✅ Available On

| Page | Cards | Table | Toggle |
|------|-------|-------|--------|
| `/patients` | ✅ | ✅ | ✅ |
| `/incidents` | ✅ | ✅ | ✅ |
| `/records` | ✅ | - | - |
| `/inventory` | - | ✅ | - |

---

**Try switching views now - click the toggle buttons!** 🚀

**Tip:** Use table view when you need to see many records at once, cards when you want more detail per record!

