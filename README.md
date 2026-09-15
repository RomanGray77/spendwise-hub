# SpendWise Hub

Create a SpendBoard application. 

# Expense Splitter — MVP Specification




## 1. Purpose




Expense Splitter is a simple local web application for a single user to record income and expenses, assign them to categories, and review financial activity grouped by category.




The application should remain intentionally small and easy to use. The MVP focuses on manual transaction entry, category management, date-range filtering, and category-based summaries.




---




## 2. Target User




The application is designed for one person.




The MVP supports only one predefined local user account.




No multi-user functionality is required.




---




## 3. Technology Stack




### Backend




- Python 3.12+

- FastAPI

- Uvicorn as the local ASGI server

- SQLAlchemy 2.x ORM

- Pydantic for request/response validation and application schemas




### Database




- SQLite for the MVP

- SQLAlchemy should abstract database access so PostgreSQL or another SQL database can be introduced later with limited changes




### Frontend




- Server-rendered HTML using Jinja2 templates

- HTML

- CSS

- Minimal vanilla JavaScript where needed

- FastAPI `StaticFiles` for CSS and JavaScript assets




A SPA framework such as React or Vue is intentionally not required for the MVP.




### Authentication




- Session-based local authentication

- One predefined local user

- Password stored as a secure password hash

- Authentication logic should remain isolated so a fuller user-management solution can be added later




### Application Type




Local web application running on the user's computer and accessed through a web browser.




Recommended local development command:




```bash

uvicorn app.main:app --reload

```




The architecture should separate:




1. presentation/routes,

2. business logic,

3. validation schemas,

4. persistence/database access,




so the application can later evolve into a hosted web application or expose a REST API without rewriting the core business logic.




---




## 4. Recommended Architecture




FastAPI should be used as the HTTP application layer rather than embedding business logic directly in route handlers.




Recommended logical layers:




```text

Browser / HTML UI

        |

        v

FastAPI Routes

        |

        v

Service Layer

        |

        v

Repository / Data Access

        |

        v

SQLAlchemy ORM

        |

        v

SQLite

```




### Responsibilities




#### FastAPI routes




Responsible for:




- HTTP request handling

- authentication checks

- form parsing

- calling service functions

- selecting templates

- redirects and HTTP responses




Routes should not contain complex financial calculations or database-specific logic.




#### Service layer




Responsible for:




- summary calculations

- income/expense separation

- percentage calculations

- transaction validation beyond basic field validation

- category deletion rules

- application workflows




#### Repository/data-access layer




Responsible for:




- SQLAlchemy queries

- creating, updating, and deleting entities

- retrieving transaction/category data




This layer makes future migration from SQLite or changes to persistence behavior easier.




#### Pydantic schemas




Responsible for:




- input validation

- typed application data

- future API request/response models




Even when HTML forms are used initially, Pydantic schemas should be used where practical for validated service-layer inputs.




---




## 5. Authentication




The application requires login.




### Requirements




- One predefined user account

- Fixed username

- Fixed password

- No user registration

- No password change functionality

- No password recovery

- No multiple user accounts




After successful login, the user is redirected to the Overview page.




Unauthenticated users must not be able to access protected application pages.




### Implementation Notes




Use session-based authentication suitable for a local server-rendered web application.




The password must not be stored in plain text.




Recommended approach:




- store a password hash

- verify the submitted password against the hash

- store authenticated state in a signed session cookie




Authentication code should remain separated from transaction/category logic.




---




## 6. Main Navigation




The application contains the following pages:




1. Login

2. Overview

3. Add Transaction

4. Categories

5. Category Details




Editing transactions is performed directly inside the Category Details page rather than on a separate page.




---




## 7. Transaction Model




Each transaction contains:




| Field | Required | Description |

|---|---|---|

| Name | Yes | Short description of the transaction |

| Category | Yes | Category assigned to the transaction |

| Amount | Yes | Positive for income, negative for expense |

| Date | Yes | Transaction date |

| Note | No | Optional free-text note |




### Amount Rules




Income and expenses are distinguished entirely through the amount sign.




Examples:




- `2500.00` → income

- `120.00` → income

- `-75.50` → expense

- `-12.00` → expense




Zero-value transactions are not allowed.




Amounts must support a maximum of two decimal places.




Currency is fixed to:




**USD ($)**




There is no multi-currency functionality.




### Monetary Storage




Do not use binary floating-point values for persisted money.




Recommended options:




- SQLAlchemy `Numeric(12, 2)` with Python `Decimal`, or

- integer cents




For this MVP, `Numeric(12, 2)` with `Decimal` is recommended because it maps naturally to SQLAlchemy and Pydantic validation.




---




## 8. Add Transaction




Transactions are created through a dedicated **Add Transaction** page.




The form contains:




- Name

- Category

- Amount

- Date

- Note

- Save button




### Default Values




The transaction date defaults to today's date.




The user can change the date before saving.




### Validation




The application must prevent saving when:




- Name is empty

- Category is not selected

- Amount is empty

- Amount equals `0`

- Amount contains more than two decimal places

- Date is missing or invalid




The note field is optional and accepts plain free text.




Transactions can only be created through the Add Transaction page.




FastAPI should validate form input before the service layer creates the transaction.




---




## 9. Categories




The user manages categories through the **Categories** page.




The application starts with the following default categories:




- Food

- Transport

- Housing

- Salary

- Entertainment

- Other




Income and expenses use the same category list.




For example, a category may contain both positive and negative transactions.




### Category Operations




The user can:




- Add category

- Rename category

- Delete category




Category names must be unique.




Duplicate category names are not allowed.




### Category Deletion Rule




A category cannot be deleted if transactions are currently assigned to it.




The user must first:




- move those transactions to another category, or

- delete those transactions




Only then can the category be deleted.




This rule should be enforced in the service layer, not only in the UI.




---




## 10. Overview Page




The Overview page is the application's main dashboard.




Its purpose is to summarize transactions by category.




### Default Date Range




Every time the Overview page is opened, the date range resets to:




**January 1 of the current year → today**




The previous date filter is not remembered.




### Custom Date Range




The user can specify:




- Start date

- End date




The overview is recalculated using only transactions within that period.




Date filtering should be performed in database queries where practical.




---




## 11. Summary Section




At the top of the Overview page, display:




### Total Income




Sum of all positive transactions within the selected date range.




### Total Expenses




Sum of all negative transactions within the selected date range.




The UI should display the expense total as a positive monetary value for readability.




Example:




Transactions:




- `-100`

- `-50`




Display:




**Total Expenses: $150.00**




### Net Balance




Calculated as:




```text

Total Income + Total Expenses

```




where expenses are stored as negative numbers.




Example:




Income: `$3000`




Expenses: `-$1200`




Net balance:




`$1800`




No additional dashboard metrics are required.




---




## 12. Category Breakdown




Below the summary, transactions are grouped into two separate sections:




### Expenses




Contains categories with expense transactions.




### Income




Contains categories with income transactions.




Each category row displays:




- Category name

- Total amount

- Number of transactions

- Percentage




---




## 13. Category Percentage Calculation




Income and expense percentages are calculated independently.




### Expense Percentage




For each category:




```text

absolute(category expense total) / absolute(total expenses) × 100

```




Example:




Food: `$300`




Total expenses: `$1200`




Food percentage:




`25%`




### Income Percentage




For each category:




```text

category income total / total income × 100

```




Example:




Salary: `$4000`




Total income: `$5000`




Salary percentage:




`80%`




Income percentages and expense percentages must never be mixed.




If total income or total expenses for the selected period is zero, the corresponding percentages should be displayed as `0%` rather than causing division by zero.




---




## 14. Category Sorting




Within the Income and Expenses sections, categories are sorted by:




**largest absolute total amount first**




Example:




1. Housing — `$1800`

2. Food — `$750`

3. Transport — `$300`




Alphabetical sorting is not required.




---




## 15. Category Details




Clicking a category on the Overview page opens the **Category Details** page.




The page displays all transactions belonging to that category within the currently selected Overview date range.




If the page is opened independently without an inherited date range, use the current-year default range.




Transactions are sorted:




**newest date first**




There is no pagination.




All matching transactions are displayed.




Each transaction shows:




- Date

- Name

- Amount

- Note

- Category




The date range should be passed through query parameters when navigating from Overview to Category Details.




Example:




```text

/categories/3?start_date=2026-01-01&end_date=2026-09-14

```




---




## 16. Edit Transaction




Transactions can be edited directly inside the Category Details page.




No separate Edit Transaction page is required.




The editable fields are:




- Name

- Category

- Amount

- Date

- Note




The same validation rules used when creating a transaction also apply when editing one.




Changing the amount from positive to negative, or vice versa, automatically changes whether the transaction is considered income or expense.




Changing the category moves the transaction into the selected category.




---




## 17. Delete Transaction




Transactions can be deleted from the Category Details page.




Deletion requires confirmation.




Example confirmation:




> Are you sure you want to delete this transaction?




The transaction must only be removed after the user explicitly confirms the action.




---




## 18. Data Model




### User




Fields:




- id

- username

- password_hash




Only one predefined user is needed for the MVP.




### Category




Fields:




- id

- name

- created_at




Constraints:




- name is required

- name must be unique




### Transaction




Fields:




- id

- name

- amount

- date

- note

- category_id

- created_at

- updated_at




Relationship:




```text

Transaction → Category

```




Each transaction belongs to exactly one category.




---




## 19. SQLAlchemy Model Relationships




```text

User

 └── predefined local account




Category

 ├── id

 ├── name

 └── transactions

      |

      └── Transaction

           ├── name

           ├── amount

           ├── date

           ├── note

           └── category_id

```




A transaction must always reference an existing category.




The database should enforce referential integrity where supported.




---




## 20. Suggested FastAPI Project Structure




```text

expense_splitter/

│

├── app/

│   ├── __init__.py

│   ├── main.py

│   ├── config.py

│   │

│   ├── database.py

│   │

│   ├── models/

│   │   ├── __init__.py

│   │   ├── user.py

│   │   ├── category.py

│   │   └── transaction.py

│   │

│   ├── schemas/

│   │   ├── __init__.py

│   │   ├── auth.py

│   │   ├── category.py

│   │   └── transaction.py

│   │

│   ├── repositories/

│   │   ├── __init__.py

│   │   ├── category_repository.py

│   │   └── transaction_repository.py

│   │

│   ├── services/

│   │   ├── __init__.py

│   │   ├── auth_service.py

│   │   ├── category_service.py

│   │   ├── transaction_service.py

│   │   └── summary_service.py

│   │

│   ├── routers/

│   │   ├── __init__.py

│   │   ├── auth.py

│   │   ├── overview.py

│   │   ├── transactions.py

│   │   └── categories.py

│   │

│   ├── templates/

│   │   ├── base.html

│   │   ├── login.html

│   │   ├── overview.html

│   │   ├── add_transaction.html

│   │   ├── categories.html

│   │   └── category_details.html

│   │

│   └── static/

│       ├── css/

│       │   └── styles.css

│       └── js/

│           └── app.js

│

├── tests/

│   ├── test_auth.py

│   ├── test_categories.py

│   ├── test_transactions.py

│   └── test_summary.py

│

├── instance/

│   └── expense_splitter.db

│

├── requirements.txt

└── README.md

```




### Notes




- `main.py` creates the FastAPI application and registers routers.

- `database.py` configures the SQLAlchemy engine, session factory, and database dependency.

- `routers/` contains HTTP endpoints.

- `schemas/` contains Pydantic models.

- `services/` contains business rules.

- `repositories/` isolates database queries.

- `templates/` contains Jinja2 HTML templates.

- `static/` contains CSS and minimal JavaScript.




This structure is slightly more layered than strictly necessary for a tiny application, but it supports the requirement that the MVP remain easy to extend later.




---




## 21. FastAPI Route Outline




A possible initial route design is:




```text

GET   /login

POST  /login

POST  /logout




GET   /

GET   /overview




GET   /transactions/new

POST  /transactions

POST  /transactions/{transaction_id}/update

POST  /transactions/{transaction_id}/delete




GET   /categories

POST  /categories

POST  /categories/{category_id}/update

POST  /categories/{category_id}/delete




GET   /categories/{category_id}

```




For the server-rendered MVP, HTML form endpoints may use POST requests for update/delete actions.




A REST-style JSON API is not required initially.




---




## 22. Core User Stories




### Authentication




As a user, I want to log in so that access to my financial data is protected.




#### Acceptance Criteria




- Correct credentials allow login.

- Incorrect credentials show an error.

- Protected pages cannot be accessed without authentication.

- Logout ends the current session.




---




### Add Transaction




As a user, I want to record an income or expense so that it appears in my financial overview.




#### Acceptance Criteria




- User can enter name, category, amount, date and optional note.

- Date defaults to today.

- Category is mandatory.

- Name is mandatory.

- Amount cannot be zero.

- Amount supports maximum two decimal places.

- Positive amount is treated as income.

- Negative amount is treated as expense.

- Saved transaction appears in the relevant category summary.




---




### View Overview




As a user, I want to see my finances grouped by category so that I can understand where my money comes from and where it goes.




#### Acceptance Criteria




- Overview defaults to the current year.

- User can select a custom date range.

- Total income is shown.

- Total expenses are shown.

- Net balance is shown.

- Income and expenses appear in separate sections.

- Categories display total amount, transaction count and percentage.

- Categories are ordered by largest absolute amount.




---




### View Category Details




As a user, I want to open a category so that I can inspect the transactions behind the summary.




#### Acceptance Criteria




- Clicking a category opens Category Details.

- Transactions belong to the selected category.

- Transactions follow the selected date range.

- Transactions are sorted newest first.

- All matching transactions are shown.




---




### Edit Transaction




As a user, I want to correct a transaction if I entered something incorrectly.




#### Acceptance Criteria




- Transaction can be edited directly on Category Details.

- All transaction fields can be changed.

- Validation rules still apply.

- Updated values immediately affect category totals.




---




### Delete Transaction




As a user, I want to delete an incorrect transaction.




#### Acceptance Criteria




- Delete action is available on Category Details.

- Confirmation is required.

- Cancel keeps the transaction.

- Confirm permanently removes it.

- Category totals update accordingly.




---




### Manage Categories




As a user, I want to manage categories so that I can organize transactions according to my needs.




#### Acceptance Criteria




- User can create categories.

- User can rename categories.

- User can delete unused categories.

- Duplicate category names are rejected.

- Categories containing transactions cannot be deleted.




---




## 23. Validation and Error Handling




The application should provide clear validation messages rather than generic server errors.




Examples:




- `Transaction name is required.`

- `Please select a category.`

- `Amount must not be zero.`

- `Amount may contain at most two decimal places.`

- `Category name already exists.`

- `This category cannot be deleted because transactions are assigned to it.`




Unexpected backend failures should return an appropriate error response and be logged locally.




---




## 24. Testing Scope




The MVP should include automated tests for the most important business rules.




Minimum recommended tests:




### Authentication




- valid login

- invalid login

- protected route without session




### Transactions




- create income

- create expense

- reject zero amount

- reject invalid decimal precision

- edit transaction

- delete transaction




### Categories




- create category

- reject duplicate category

- rename category

- prevent deletion when transactions exist

- delete unused category




### Overview




- correct total income

- correct total expenses

- correct net balance

- correct expense percentages

- correct income percentages

- correct date filtering

- correct category sorting




FastAPI's `TestClient` should be used for route-level tests.




Business calculations should also be testable independently at the service layer.




---




## 25. Explicitly Out of Scope for MVP




The following features are intentionally excluded:




- Multiple users

- User registration

- Password change

- Password recovery

- Cloud hosting

- Mobile app

- Multiple currencies

- Currency conversion

- Recurring transactions

- CSV import

- CSV export

- Bank integration

- Transaction search

- Additional transaction filters

- Charts

- Pie charts

- Bar charts

- Budgets

- Spending limits

- Notifications

- Attachments or receipts

- Pagination

- Shared expenses

- Expense splitting between people

- React/Vue/Angular frontend

- Public REST API




---




## 26. Future Extensions




The architecture should avoid blocking the following future additions.




### Multi-user support




Add user ownership to transactions and categories.




### Server database




Replace SQLite with PostgreSQL or another SQL database.




Because SQLAlchemy is used, the application should require relatively small persistence-layer changes.




### Recurring transactions




Introduce recurring transaction templates and scheduled creation.




### Import/export




Add CSV or Excel support.




### Hosted version




Deploy FastAPI behind a production ASGI server setup.




### REST API




Expose service-layer functionality through JSON endpoints.




FastAPI is particularly suitable for this extension because Pydantic schemas and OpenAPI documentation are built into the framework.




### Richer frontend




A React, Vue, or other JavaScript frontend could later consume the FastAPI backend without replacing the service and persistence layers.




---




## 27. MVP Definition of Done




The MVP is complete when the user can:




1. Log in.

2. Add income and expense transactions.

3. Create and manage categories.

4. View transactions grouped by category.

5. Select a custom date range.

6. See total income, total expenses, and net balance.

7. See category amount, count, and percentage.

8. Open a category and inspect its transactions.

9. Edit transactions.

10. Delete transactions with confirmation.

11. Use the complete application locally through a browser with SQLite persistence.

12. Run the application through FastAPI/Uvicorn.

13. Execute automated tests for the key business rules.

Anything beyond these capabilities should be treated as a separate enhancement rather than part of the initial MVP.

Centralize every backend call in one services layer, and create a mock
implementation of it so the whole app runs without a real backend.

Add tests.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fde81196-7435-4010-9728-6807d71ea78a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
