# Logo Placement Instructions

## Where to Place Your Logo PNG File

Place your logo PNG file in the following location:

```
frontend/public/logo.png
```

### Steps:
1. Get your logo PNG file (e.g., `sunlife-logo.png`)
2. Rename it to `logo.png` (or keep the original name and update the code)
3. Copy it to: `/frontend/public/logo.png`

### File Path Structure:
```
frontend/
  └── public/
      └── logo.png  ← Place your logo here
```

### Notes:
- The logo will be automatically accessible at `/logo.png` in the application
- Supported formats: PNG, JPG, SVG
- Recommended size: 200x200px or larger (will be scaled automatically)
- If the logo file doesn't exist, the application will hide the image and show text-only branding

### Current Usage:
The logo is used in:
- Login page (left and right columns)
- Sidebar (if you update the Logo component)
- Any other component that uses the logo

### To Update Logo Component:
If you want to use the logo in other components, you can import it like this:
```tsx
<img src="/logo.png" alt="SunLife Solar Logo" className="h-20 w-auto" />
```
