# WattWise — Smart Electricity Planner

A polished, responsive electricity-bill estimation website made with **HTML5, CSS3, Bootstrap 5, and vanilla JavaScript**. No backend, framework, or API key is required.

## Run the project
1. Extract `WattWise.zip`.
2. Open the `WattWise` folder.
3. Double-click `index.html` to open it in your browser.

For the best experience, use an internet connection so the Bootstrap, font, and Supabase client CDNs can load. Supabase is optional; without configuration, the app uses browser storage as before.

## Features
- Responsive landing page and energy dashboard
- Live electricity bill calculator with adjustable units, rate, fixed charge, and billing period
- Visual cost breakdown and instant energy insights
- Appliance planner with preset devices and custom power values
- Monthly kWh and estimated cost per appliance
- Copy appliance usage into the bill calculator
- Savings simulator with a 0–50% energy reduction slider
- Practical energy-saving tips
- Save and delete recent estimates using browser `localStorage`
- Dark/light theme toggle, hover animations, responsive navigation, and toast notifications
- Input validation and accessible labels
- Optional private estimate-history sync with Supabase anonymous auth and row-level security

## Calculation used
- Appliance energy (kWh) = watts × quantity × hours per day × days ÷ 1000
- Estimated bill = monthly units × cost per unit + fixed monthly charge
- Potential savings = energy charge × selected reduction percentage

## Important note
This project provides an educational estimate. Real electricity bills can also include slab-based rates, taxes, subsidies, meter charges, and other adjustments. Set the per-unit rate and fixed charge to match the approximate details on your bill.

## Project structure
```
WattWise/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── script.js
│   └── supabase-config.js
├── supabase/
│   └── schema.sql
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
└── README.md
```

## Free deployment

### GitHub Pages
1. Push this project folder to the root of a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy-pages.yml` publishes the site after each push to `main`. The published URL appears in the workflow run and under **Settings → Pages**.

### Optional Supabase history sync
1. Create a Supabase project on its free plan.
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**.
3. In the Supabase SQL Editor, run `supabase/schema.sql`.
4. Copy the project URL and its public anon/publishable key from **Project Settings → API** into `url` and `anonKey` in `js/supabase-config.js`, then push the change.

The Supabase URL and anon key are public browser credentials. The table is protected by row-level security and only allows each anonymous user to access their own estimates. Never put a Supabase `service_role` key in this project. Supabase sync is optional; with blank config, saved estimates stay in browser storage. Anonymous accounts are tied to that browser session, so they do not provide cross-device account recovery.
