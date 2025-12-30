# Rotating Categories Schema Rules

## Overview
Rotating categories are schedule entries for rotating multipliers. Each entry defines which spending category applies during a specific time period.

## Output Format
Return an ARRAY of schedule entry objects, NOT a single object.

## Required Fields per Entry

| Field | Type | Description |
|-------|------|-------------|
| category | string | Spending category (e.g., "dining", "gas", "shopping") |
| subCategory | string | Sub-category or empty string "" if none |
| periodType | string | One of: "quarter", "month", "half_year", "year" |
| periodValue | number | Quarter: 1-4, Month: 1-12, Half: 1-2, Year: omit |
| year | number | The year (e.g., 2025) |
| title | string | REQUIRED - Descriptive display name |

## Valid Categories
dining, gas, shopping, travel, entertainment, groceries, drugstores, home improvement, streaming, transit, general, portal

## Period Types
- quarter: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
- month: 1-12 (January-December)
- half_year: H1 (Jan-Jun), H2 (Jul-Dec)
- year: Full year (no periodValue needed)

## Critical Rules
- title MUST be descriptive and human-readable (e.g., "Amazon.com purchases", "Restaurants & Dining")
- category MUST be lowercase
- subCategory should be lowercase or empty string
- periodValue is required for quarter, month, half_year (omit for year)
- Multiple entries can have the same period (same quarter can have multiple categories)

## Example Output
```json
[
  {
    "category": "shopping",
    "subCategory": "amazon",
    "periodType": "quarter",
    "periodValue": 1,
    "year": 2025,
    "title": "Amazon.com purchases"
  },
  {
    "category": "dining",
    "subCategory": "restaurants",
    "periodType": "quarter",
    "periodValue": 2,
    "year": 2025,
    "title": "Restaurants & Dining"
  },
  {
    "category": "gas",
    "subCategory": "",
    "periodType": "quarter",
    "periodValue": 3,
    "year": 2025,
    "title": "Gas Stations"
  },
  {
    "category": "groceries",
    "subCategory": "",
    "periodType": "quarter",
    "periodValue": 4,
    "year": 2025,
    "title": "Grocery Stores"
  }
]
```
