# Orange Design System - Quick Reference 🧡

## TL;DR
**Use ORANGE for everything. No exceptions.**

---

## Color Usage Rules

### ✅ DO

```tsx
// Primary actions - Use orange
<Button className="bg-primary">Submit</Button>
<Button className="bg-orange-500">Submit</Button>

// Hover states - Use orange hover
<Button className="hover:bg-primary-hover">Button</Button>
<div className="hover:bg-orange-600">Card</div>

// Light backgrounds - Use orange light
<div className="bg-primary-light">Card</div>
<div className="bg-orange-50">Background</div>

// Gradients - Use orange gradients
<div className="bg-gradient-to-r from-orange-500 to-orange-600">Header</div>

// Borders - Use orange borders
<div className="border-orange-200">Card</div>

// Text - Use orange text
<span className="text-orange-700">Label</span>
<h1 className="text-primary">Title</h1>

// Badges - Use orange
<Badge variant="secondary">New</Badge> {/* Orange by default */}
```

---

### ❌ DON'T

```tsx
// NEVER use other colors for branding
<Button className="bg-blue-500">Submit</Button>     // ❌ NO
<Button className="bg-green-600">Submit</Button>    // ❌ NO
<Button className="bg-purple-500">Submit</Button>   // ❌ NO
<Button className="bg-teal-500">Submit</Button>     // ❌ NO

// NEVER use role-based colors
const color = user.role === 'admin' ? 'blue' : 'green';  // ❌ NO

// NEVER conditionally style by role
if (role === 'admin') { className = 'bg-purple-500' }    // ❌ NO
```

---

## CSS Variables Quick Reference

```css
/* Primary Colors - Use these! */
var(--primary)          /* #FF6B35 - Main orange */
var(--primary-hover)    /* #E85A28 - Hover state */
var(--primary-light)    /* #FFF0EB - Light bg */
var(--primary-dark)     /* #D14920 - Dark variant */

/* Orange Scale */
var(--orange-50)        /* #FFF7F3 - Lightest */
var(--orange-100)       /* #FFEDE5 */
var(--orange-200)       /* #FFD6C2 */
var(--orange-300)       /* #FFB89E */
var(--orange-400)       /* #FF9B7A */
var(--orange-500)       /* #FF6B35 - Primary */
var(--orange-600)       /* #E85A28 - Hover */
var(--orange-700)       /* #D14920 */
var(--orange-800)       /* #B93F1C */
var(--orange-900)       /* #A03518 - Darkest */

/* Semantic Colors - STATUS ONLY (not branding) */
var(--success)          /* #10B981 - Green for success */
var(--error)            /* #EF4444 - Red for errors */
var(--warning)          /* #F59E0B - Yellow for warnings */
var(--info)             /* #3B82F6 - Blue for info */
```

---

## Tailwind Classes Quick Reference

### Backgrounds
```tsx
bg-primary              // Orange 500
bg-primary-hover        // Orange 600
bg-primary-light        // Orange 100
bg-orange-50           // Lightest
bg-orange-100          // Light
bg-orange-500          // Primary
bg-orange-600          // Hover
```

### Text
```tsx
text-primary           // Orange text
text-orange-700        // Dark orange text
text-orange-800        // Darker orange text
```

### Borders
```tsx
border-orange-200      // Light orange border
border-orange-500      // Primary orange border
border-primary         // Orange border
```

### Gradients
```tsx
from-orange-500 to-orange-600     // Standard gradient
from-orange-50 to-orange-100      // Light gradient
bg-gradient-to-r from-orange-...  // Right gradient
bg-gradient-to-br from-orange-... // Bottom-right gradient
```

---

## Component Patterns

### Button
```tsx
// Primary button (orange)
<Button variant="default">Submit</Button>

// Secondary button (light orange)
<Button variant="secondary">Cancel</Button>

// Outline button with orange hover
<Button variant="outline">View</Button>

// Custom orange gradient
<Button className="bg-gradient-to-r from-orange-600 to-orange-700">
  Save Changes
</Button>
```

### Badge
```tsx
// Primary badge (orange)
<Badge variant="default">New</Badge>

// Secondary badge (light orange)
<Badge variant="secondary">Active</Badge>

// Status badges (semantic colors - OK to use)
<Badge variant="success">Completed</Badge>  // Green
<Badge variant="error">Failed</Badge>       // Red
<Badge variant="warning">Pending</Badge>    // Yellow
```

### Card Headers
```tsx
// Orange gradient header
<div className="bg-gradient-to-r from-orange-600 to-orange-600 p-6 text-white">
  <CardTitle>Profile Settings</CardTitle>
</div>
```

### Avatar/Profile Pictures
```tsx
// Orange gradient background
<div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full">
  <Image src={avatar} alt="Avatar" />
</div>
```

---

## Common Scenarios

### 1. Profile Page Header
```tsx
<div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100">
  <div className="flex items-center gap-6">
    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full">
      {/* Avatar */}
    </div>
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
        {name}
      </h1>
      <Badge className="bg-gradient-to-r from-orange-100 to-orange-100 text-orange-800">
        {role}
      </Badge>
    </div>
  </div>
</div>
```

### 2. Dashboard Stats Cards
```tsx
<Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
  <CardHeader>
    <CardTitle>Total Users</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-orange-700">1,234</div>
  </CardContent>
</Card>
```

### 3. Action Buttons
```tsx
<Button className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800">
  <Save className="w-4 h-4 mr-2" />
  Save Changes
</Button>
```

### 4. Notification Badge
```tsx
<div className="relative">
  <Bell className="w-5 h-5" />
  {count > 0 && (
    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded-full px-2 py-1">
      {count}
    </span>
  )}
</div>
```

---

## Status Colors (Exceptions)

**ONLY use these for status indicators, NOT for UI elements:**

```tsx
// Success states ✅
<Badge variant="success">Active</Badge>        // Green
<span className="text-green-700">Completed</span>

// Error states ❌
<Badge variant="error">Failed</Badge>          // Red
<span className="text-red-700">Cancelled</span>

// Warning states ⚠️
<Badge variant="warning">Pending</Badge>       // Yellow/Orange
<span className="text-orange-700">Late</span>

// Info states ℹ️
<Badge variant="info">Info</Badge>             // Blue (rare)
```

---

## Role Configuration

**NEVER** create role-based color logic:

### ❌ WRONG
```typescript
const roleColors = {
  admin: 'purple',
  student: 'green',
  supervisor: 'orange',
  driver: 'blue'
};

const color = roleColors[user.role]; // ❌ NO
```

### ✅ RIGHT
```typescript
// All roles use the same config
const roleConfig = {
  admin: { color: 'from-orange-500 to-orange-600', ... },
  student: { color: 'from-orange-500 to-orange-600', ... },
  supervisor: { color: 'from-orange-500 to-orange-600', ... },
  driver: { color: 'from-orange-500 to-orange-600', ... },
};
```

---

## Migration Checklist for New Features

When adding new components or pages:

- [ ] Use `bg-primary` or `bg-orange-500` for primary actions
- [ ] Use `bg-orange-50` or `bg-orange-100` for light backgrounds
- [ ] Use `from-orange-500 to-orange-600` for gradients
- [ ] Use `hover:bg-orange-600` for hover states
- [ ] Use `text-orange-700` or `text-orange-800` for text
- [ ] Use `border-orange-200` for borders
- [ ] NO role-based color logic
- [ ] NO blue/green/purple/teal for branding
- [ ] Use semantic colors ONLY for status

---

## Testing Your Changes

```bash
# Search for any remaining non-orange colors
grep -r "bg-blue-" src/
grep -r "bg-green-" src/
grep -r "bg-purple-" src/
grep -r "bg-teal-" src/
grep -r "from-blue-" src/
grep -r "from-green-" src/

# Should only find semantic status colors (success/error/warning)
```

---

## Quick Conversion Table

| Old Color | New Color | Usage |
|-----------|-----------|-------|
| `bg-blue-500` | `bg-orange-500` | Primary |
| `bg-green-500` | `bg-orange-500` | Primary |
| `bg-purple-500` | `bg-orange-500` | Primary |
| `bg-teal-500` | `bg-orange-500` | Primary |
| `text-blue-700` | `text-orange-700` | Text |
| `border-blue-200` | `border-orange-200` | Borders |
| `from-blue-500 to-blue-600` | `from-orange-500 to-orange-600` | Gradients |

---

## Need Help?

- **Unsure which color to use?** → Use orange
- **Need a gradient?** → Use `from-orange-500 to-orange-600`
- **Need a light background?** → Use `bg-orange-50` or `bg-orange-100`
- **Need status color?** → Use semantic colors (success/error/warning)
- **Role-based styling?** → Don't. Use orange for everyone.

---

## Remember

🧡 **Orange is the ONLY branding color**
🎨 **One color system = Strong brand**
✅ **Consistency = Better UX**

**When in doubt, use orange!**
