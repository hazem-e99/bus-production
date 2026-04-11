# ⚡ QUICK ACCESSIBILITY REFERENCE CARD

**Print this and keep it at your desk!** 📋

---

## 🎨 ORANGE USAGE - AT A GLANCE

### ✅ CORRECT USAGE

```tsx
// ✅ Badge with white text
<Badge className="bg-orange-500 text-white">Active</Badge>

// ✅ Button with white text  
<Button className="bg-orange-600 text-white">Save</Button>

// ✅ Card with orange accent header
<Card className="bg-white">
  <CardHeader className="bg-orange-50">
    <h3 className="text-gray-900">Title</h3>
  </CardHeader>
</Card>

// ✅ Icon on orange background
<div className="bg-orange-500 p-2">
  <Icon className="text-white" />
</div>
```

### ❌ WRONG USAGE

```tsx
// ❌ Orange text on light orange
<div className="bg-orange-100">
  <span className="text-orange-700">Bad!</span>
</div>

// ❌ Orange text on white (too bright)
<p className="text-orange-500">Don't do this</p>

// ❌ Full orange card background
<Card className="bg-orange-100">
  <p className="text-orange-800">Hard to read</p>
</Card>

// ❌ Gradient text
<h1 className="bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text">
  Avoid this
</h1>
```

---

## 📊 CONTRAST CHEAT SHEET

### Minimum Required Ratios (WCAG)

| Text Size | Normal Text | Large Text* |
|-----------|-------------|-------------|
| **AA** | 4.5:1 | 3:1 |
| **AAA** | 7:1 | 4.5:1 |

*Large text = 18pt+ or 14pt+ bold

### Pre-Approved Combinations

| Combination | Ratio | Pass | Use For |
|-------------|-------|------|---------|
| `text-gray-900` on `bg-white` | 14:1 | AAA ✅ | Body text, headers |
| `text-white` on `bg-orange-500` | 4.6:1 | AA ✅ | Badges, buttons |
| `text-white` on `bg-orange-600` | 4.6:1 | AA ✅ | Buttons, badges |
| `text-gray-600` on `bg-white` | 5.9:1 | AA ✅ | Secondary text |
| `text-gray-900` on `bg-orange-50` | 12.4:1 | AAA ✅ | Text in accent headers |

---

## 🚫 BANNED COMBINATIONS

| Combination | Ratio | Why Banned |
|-------------|-------|------------|
| `text-orange-700` on `bg-orange-100` | 3.1:1 | Fails AA ❌ |
| `text-orange-800` on `bg-orange-100` | 2.9:1 | Fails AA ❌ |
| `text-orange-900` on `bg-orange-100` | 3.9:1 | Fails AA ❌ |
| `text-orange-600` on `bg-orange-50` | 3.2:1 | Fails AA ❌ |
| `text-orange-500` on `bg-white` | 2.8:1 | Too bright ❌ |

---

## 🎯 QUICK DECISION TREE

```
Need to use orange?
│
├─ For text on card?
│  └─ Use text-gray-900 instead!
│
├─ For badge?
│  └─ Use bg-orange-500 text-white ✅
│
├─ For button?
│  └─ Use bg-orange-600 text-white ✅
│
├─ For icon?
│  ├─ On white background?
│  │  └─ Use text-gray-700 instead!
│  │
│  └─ On orange background?
│     └─ Use text-white ✅
│
└─ For card accent?
   └─ Use bg-orange-50 with text-gray-900 ✅
```

---

## 📱 MOBILE CHECKLIST

- [ ] Touch targets minimum 44x44px
- [ ] Text minimum 16px (1rem)
- [ ] Line height 1.7 or higher
- [ ] Contrast ratio passes on small screens
- [ ] Safe-area-inset for notch
- [ ] Test on real device

---

## 🧪 TESTING TOOLS

1. **WebAIM Contrast Checker**
   - https://webaim.org/resources/contrastchecker/
   - Paste colors, get instant ratio

2. **Browser DevTools**
   - Chrome: Inspect > Lighthouse > Accessibility
   - Firefox: Accessibility Inspector

3. **Screen Reader Test**
   - Mac: VoiceOver (Cmd+F5)
   - Windows: NVDA (free)

---

## 🎨 COLOR PALETTE REFERENCE

### Orange Scale
```
orange-50:  #FFF7F3 (Lightest - backgrounds)
orange-100: #FFEDE5 (Light - backgrounds)
orange-200: #FFD6C2 (Borders)
orange-500: #FF6B35 (Primary - with white text)
orange-600: #E85A28 (Buttons - with white text)
orange-700: #D14920 (Focus states)
orange-900: #A03518 (Darkest - avoid)
```

### Neutral Scale
```
gray-50:  #F9FAFB (Hover states)
gray-600: #6B7280 (Secondary text)
gray-900: #1F2937 (Primary text)
white:    #FFFFFF (Backgrounds)
```

---

## ✅ COMPONENT QUICK REFERENCE

### Badge
```tsx
// ✅ Correct
<Badge variant="secondary">Active</Badge>  // Orange bg, white text
<Badge variant="success">Done</Badge>      // Green
<Badge variant="error">Failed</Badge>      // Red

// ❌ Wrong
<Badge className="bg-orange-100 text-orange-700">Bad</Badge>
```

### Button
```tsx
// ✅ Correct
<Button variant="default">Save</Button>    // Orange bg, white text
<Button variant="secondary">Cancel</Button> // Orange-600 bg, white text
<Button variant="outline">View</Button>    // White bg, gray text

// ❌ Wrong
<Button className="bg-orange-100 text-orange-700">Bad</Button>
```

### Card
```tsx
// ✅ Correct Pattern
<Card className="bg-white border-gray-200">
  <CardHeader className="bg-orange-50">
    <CardTitle className="text-gray-900">Title</CardTitle>
    <div className="bg-orange-500 p-2">
      <Icon className="text-white" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-gray-900">Content</div>
    <p className="text-gray-600">Description</p>
  </CardContent>
</Card>

// ❌ Wrong Pattern
<Card className="bg-orange-100">
  <CardTitle className="text-orange-800">Bad</CardTitle>
  <p className="text-orange-700">Hard to read</p>
</Card>
```

---

## 🚨 COMMON MISTAKES

### Mistake #1: Orange Text on White
```tsx
// ❌ Wrong (Too bright, low contrast)
<p className="text-orange-500">Text here</p>

// ✅ Correct
<p className="text-gray-900">Text here</p>
```

### Mistake #2: Orange on Orange
```tsx
// ❌ Wrong (Fails contrast)
<div className="bg-orange-100">
  <span className="text-orange-700">Bad</span>
</div>

// ✅ Correct
<div className="bg-orange-50">
  <span className="text-gray-900">Good</span>
</div>
```

### Mistake #3: Gradient Text
```tsx
// ❌ Wrong (Reduced readability)
<h1 className="bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
  Title
</h1>

// ✅ Correct
<h1 className="text-gray-900">Title</h1>
```

---

## 💡 PRO TIPS

1. **When in doubt, use gray text on white background** (14:1 ratio)
2. **Orange is for ACCENTS, not text**
3. **White text needs orange-500+ background**
4. **Test on real devices, not just desktop**
5. **Use WebAIM checker for every new color combo**
6. **Dark text = readable, Orange text = decorative**

---

## 📏 QUICK SIZES

```tsx
// Text Sizes
text-xs:   12px (Minimum for labels)
text-sm:   14px (Avoid for body text)
text-base: 16px (Minimum for body)
text-lg:   18px (Good for headers)

// Icon Sizes  
h-4 w-4:   16px (Minimum, prefer 20px+)
h-5 w-5:   20px (Good)
h-6 w-6:   24px (Better, recommended)

// Button Heights
h-8:       32px (Too small for touch)
h-10:      40px (OK)
h-12:      48px (Best for mobile)

// Touch Targets
44x44px minimum (WCAG guideline)
```

---

## 🎯 REMEMBER

1. ✅ **Orange = Accent color**
2. ✅ **Gray = Text color**
3. ✅ **White = Background color**
4. ✅ **Test contrast every time**
5. ✅ **Mobile-first thinking**

---

**Keep this card visible while coding!** 📌

*Last Updated: April 10, 2026*
