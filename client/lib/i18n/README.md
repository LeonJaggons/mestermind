# Internationalization (i18n) Setup

This project supports multiple languages with a simple, context-based translation system. Language preference is stored in localStorage.

## Supported Languages

- English (`en`) - Default
- Hungarian (`hu`)

## Usage

### Basic Translation

```tsx
import { useI18n } from "@/lib/contexts/I18nContext";

function MyComponent() {
  const { t } = useI18n();
  
  return <h1>{t("nav.home")}</h1>;
}
```

### Translation with Parameters

```tsx
const { t } = useI18n();
const message = t("welcome.message", { name: "John" });
// Translation: "Welcome, {{name}}!" → "Welcome, John!"
```

### Changing Language

```tsx
import { useI18n } from "@/lib/contexts/I18nContext";

function MyComponent() {
  const { language, setLanguage } = useI18n();
  
  return (
    <button onClick={() => setLanguage("hu")}>
      Switch to Hungarian
    </button>
  );
}
```

## Adding New Translations

1. Add the translation key to both language files:
   - `/lib/i18n/translations/en.ts`
   - `/lib/i18n/translations/hu.ts`

2. Use a hierarchical key structure with dots:
   ```typescript
   "section.subsection.key": "Translation"
   ```

3. Use `{{paramName}}` for dynamic values:
   ```typescript
   "welcome.message": "Welcome, {{name}}!"
   ```

## Language Chooser Component

The `LanguageChooser` component is already integrated into the Header. It provides a dropdown to switch between available languages.

## Language Persistence

The selected language is automatically saved to `localStorage` and restored on page load.
