# Project Structure Guide

Complete guide to the YNM Safety Price Engine & CRM System project structure.

## 📂 Directory Structure

```
price-engine-ysm/
│
├── 📁 app/                          # Next.js App Router (Pages & API Routes)
│   ├── 📁 api/                      # API Routes
│   │   ├── 📁 accounts/              # Accounts CRUD & related
│   │   ├── 📁 auth/                 # Authentication
│   │   ├── 📁 crm/                  # CRM modules
│   │   ├── 📁 contacts/             # Contacts management
│   │   ├── 📁 meta/                 # Metadata endpoints
│   │   ├── 📁 notifications/        # Notifications system
│   │   ├── 📁 quotations/           # Quotation analytics
│   │   └── 📁 quotes/               # Quotation CRUD
│   │
│   ├── 📁 crm/                      # CRM Pages
│   │   ├── 📁 accounts/             # Accounts management
│   │   ├── 📁 customers/            # Customer management
│   │   ├── 📁 dashboard/            # Dashboard
│   │   ├── 📁 leads/                # Leads management
│   │   ├── 📁 notifications/        # Notifications center
│   │   └── 📁 tasks/                # Task manager
│   │
│   ├── 📁 history/                  # Quotation history
│   ├── 📁 login/                    # Login page
│   ├── 📁 mbcb/                     # MBCB module
│   ├── 📁 paint/                    # Paint module
│   ├── 📁 quotation-status/         # Admin status view
│   ├── 📁 quotation-status-update/  # Employee status update
│   ├── 📁 signages/                 # Signages module
│   ├── 📁 change-password/          # Password reset
│   ├── 📁 utils/                    # Utility functions
│   ├── 📄 page.tsx                  # Homepage
│   ├── 📄 layout.tsx                # Root layout
│   └── 📄 globals.css               # Global styles
│
├── 📁 components/                    # React Components
│   ├── 📁 animations/               # Animation components
│   ├── 📁 crm/                      # CRM-specific components
│   ├── 📁 forms/                    # Form components
│   ├── 📁 layout/                   # Layout components
│   ├── 📁 modals/                   # Modal components
│   └── 📁 ui/                       # UI components
│
├── 📁 contexts/                     # React Contexts
│   └── 📄 UserContext.tsx           # User context
│
├── 📁 data/                         # Data Files
│   ├── 📁 config/                   # Configuration
│   └── 📁 master/                   # Master data
│
├── 📁 docs/                         # Documentation
│   ├── 📁 SQL Scripts/              # Database scripts
│   ├── 📁 Guides/                   # Setup guides
│   └── 📁 Summaries/                # Implementation summaries
│
├── 📁 hooks/                        # Custom Hooks
│   └── 📄 useDebounce.ts           # Debounce hook
│
├── 📁 lib/                          # Library Code
│   ├── 📁 constants/                # Constants & Types
│   └── 📁 utils/                    # Utility functions
│
├── 📁 public/                       # Static Assets
│   └── 📁 templates/                # PDF templates
│
├── 📁 scripts/                      # Build Scripts
│   └── 📁 convert/                  # Data conversion
│
├── 📄 .env.local                    # Environment variables (not in git)
├── 📄 .gitignore                    # Git ignore rules
├── 📄 package.json                  # Dependencies
├── 📄 tsconfig.json                 # TypeScript config
├── 📄 tailwind.config.ts            # Tailwind config
├── 📄 next.config.js                # Next.js config
├── 📄 README.md                     # Main README
└── 📄 PROJECT_STRUCTURE.md          # This file
```

## 📋 File Naming Conventions

### Pages (`app/`)
- Use lowercase with hyphens: `quotation-status-update`
- Route files: `page.tsx`
- Layout files: `layout.tsx`

### Components (`components/`)
- Use PascalCase: `ButtonCard.tsx`, `ActivityTimeline.tsx`
- Group by feature: `crm/`, `forms/`, `layout/`

### API Routes (`app/api/`)
- Use lowercase with hyphens: `update-status`
- Route files: `route.ts`
- Dynamic routes: `[id]/route.ts`

### Utilities (`lib/utils/`)
- Use camelCase: `pdfGeneratorYNMEST.ts`
- Descriptive names

### Types (`lib/constants/`)
- Single file: `types.ts`
- Export all interfaces and types

## 🗂️ Key Directories Explained

### `/app`
Next.js App Router directory. Contains all pages and API routes.

**Pages:**
- `page.tsx` - Homepage (role-based navigation)
- `login/` - Authentication
- `mbcb/`, `signages/`, `paint/` - Price engine modules
- `crm/` - CRM system pages
- `history/` - Quotation history
- `quotation-status/` - Status management

**API Routes:**
- Organized by feature/module
- Follow RESTful conventions
- Use TypeScript for type safety

### `/components`
Reusable React components organized by purpose.

**Structure:**
- `animations/` - Animation components
- `crm/` - CRM-specific components
- `forms/` - Form input components
- `layout/` - Layout components (navbar, footer, etc.)
- `modals/` - Modal dialogs
- `ui/` - Generic UI components

### `/lib`
Shared library code and utilities.

**Structure:**
- `constants/` - Type definitions, constants
- `utils/` - Utility functions (PDF generation, Supabase client)

### `/docs`
Documentation and SQL scripts.

**Organization:**
- SQL scripts for database setup
- Implementation summaries
- Setup guides
- API documentation

### `/data`
Static data files and master data.

**Structure:**
- `config/` - Configuration files
- `master/` - Master data (Excel conversions)

## 🔑 Key Files

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables (create this)

### Entry Points
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Homepage
- `app/globals.css` - Global styles

### Core Utilities
- `lib/utils/supabaseClient.ts` - Supabase client
- `lib/utils/pdfGeneratorYNMEST.ts` - PDF generation
- `lib/constants/types.ts` - TypeScript types

## 📝 Code Organization Principles

1. **Feature-Based Organization**
   - Group related files together
   - Keep API routes near their pages

2. **Component Reusability**
   - Extract common patterns into components
   - Use composition over duplication

3. **Type Safety**
   - Define types in `lib/constants/types.ts`
   - Use TypeScript strictly

4. **API Consistency**
   - Follow RESTful conventions
   - Consistent error handling
   - Standard response formats

5. **Documentation**
   - Keep docs updated
   - Document complex logic
   - Include setup instructions

## 🚀 Adding New Features

### Adding a New Page
1. Create `app/feature-name/page.tsx`
2. Add route to navigation if needed
3. Update types if needed

### Adding a New API Route
1. Create `app/api/feature-name/route.ts`
2. Follow existing patterns
3. Add error handling

### Adding a New Component
1. Create in appropriate subdirectory
2. Export from component file
3. Use TypeScript types

### Adding Database Changes
1. Create SQL script in `docs/`
2. Update `COMPLETE_DATABASE_SETUP.sql`
3. Document changes

## 📚 Documentation Files

- `README.md` - Main project documentation
- `PROJECT_STRUCTURE.md` - This file
- `docs/README.md` - Documentation index
- `docs/DATABASE_SETUP_GUIDE.md` - Database setup
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/FEATURES_OVERVIEW.md` - Feature list

## 🔍 Finding Files

### By Purpose
- **Pages**: `app/[feature]/page.tsx`
- **API Routes**: `app/api/[feature]/route.ts`
- **Components**: `components/[category]/[Component].tsx`
- **Types**: `lib/constants/types.ts`
- **Utilities**: `lib/utils/[utility].ts`

### By Feature
- **CRM**: `app/crm/`, `app/api/crm/`, `components/crm/`
- **Accounts**: `app/crm/accounts/`, `app/api/accounts/`
- **Quotations**: `app/api/quotes/`, `app/history/`
- **Price Engine**: `app/mbcb/`, `app/signages/`, `app/paint/`

## ✅ Best Practices

1. **Keep files focused** - One responsibility per file
2. **Use TypeScript** - Type everything
3. **Follow naming conventions** - Consistent naming
4. **Document complex logic** - Add comments where needed
5. **Organize by feature** - Group related code
6. **Reuse components** - Don't duplicate code
7. **Test before committing** - Verify changes work

## 🔄 Maintenance

### Regular Tasks
- Update dependencies: `npm update`
- Run linter: `npm run lint`
- Check for unused files
- Update documentation

### Before Deployment
- Run database migrations
- Test all features
- Verify environment variables
- Check build: `npm run build`

