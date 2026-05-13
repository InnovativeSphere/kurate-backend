# Kurate — Gadget Marketplace Backend

Node.js · NestJS · PostgreSQL · Prisma · Cloudinary · JWT · Swagger

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL database
- Cloudinary account (for image uploads)

### Installation
```bash
git clone https://github.com/your-org/kurate-backend.git
cd kurate-backend
npm install

Database Setup

npx prisma migrate dev --name init   # apply all migrations
npx prisma generate                  # generate Prisma client

Running the Server
npm run start:dev   # watches for changes

The API will be available at http://localhost:3000.
Swagger docs: http://localhost:3000/api/docs.

📚 API Overview
All endpoints are prefixed with http://localhost:3000/.

Auth
Method	Endpoint	Access	Description
POST	/auth/register	Public	Register a new user (email, password, role)
POST	/auth/login	Public	Login, sets access_token & refresh_token cookies
POST	/auth/logout	Authenticated	Clears auth cookies
POST	/auth/refresh	Public	Refreshes the access token using refresh cookie
Roles: BUYER, SELLER, ADMIN.

Users
Method	Endpoint	Access	Description
GET	/users/me	Any authenticated	Current user profile
PATCH	/users/me	Any authenticated	Update own email, password, phone, theme (light/dark/sepia)
DELETE	/users/me	Any authenticated	Soft‑delete own account (disable)
GET	/users	ADMIN	List all users (paginated)
GET	/users/:id	ADMIN	View any user
PATCH	/users/:id/role	ADMIN	Change a user’s role
DELETE	/users/:id	ADMIN	Hard‑delete user and cascade
POST	/users/:id/restore	ADMIN	Restore a soft‑deleted user
GET	/users/stats	ADMIN	User statistics (total, new this week, by role)
Categories
Method	Endpoint	Access	Description
GET	/categories	Public	Active categories (paginated)
GET	/categories/:id	Public	Single category
POST	/categories	ADMIN	Create category
PATCH	/categories/:id	ADMIN	Update category
DELETE	/categories/:id	ADMIN	Soft‑delete category
POST	/categories/:id/restore	ADMIN	Restore soft‑deleted category
DELETE	/categories/:id/permanent	ADMIN	Hard‑delete (only if no products)
GET	/categories/admin/all	ADMIN	All categories (incl. soft‑deleted)
Sellers
Method	Endpoint	Access	Description
GET	/sellers	Public	Active sellers
GET	/sellers/:id	Public	Seller details
POST	/sellers/my-shop	Authenticated	Create seller shop
GET	/sellers/my-shop	Authenticated	Own shop profile
PATCH	/sellers/my-shop	Authenticated	Update own shop
DELETE	/sellers/my-shop	Authenticated	Disable own shop (soft)
GET	/sellers/admin/all	ADMIN	All sellers (filters: status, includeDeleted)
GET	/sellers/admin/stats	ADMIN	Seller statistics
PATCH	/sellers/:id/verification	ADMIN	Set verification status
PATCH	/sellers/:id	ADMIN	Admin update any seller
DELETE	/sellers/:id	ADMIN	Admin soft‑delete seller
POST	/sellers/:id/restore	ADMIN	Restore soft‑deleted seller
DELETE	/sellers/:id/permanent	ADMIN	Hard‑delete seller + all products
Products
Method	Endpoint	Access	Description
GET	/products	Public	Active products (search, filter by category, condition, price range)
GET	/products/:id	Public	Product detail (records a view)
POST	/products	Seller (verified)	Create product with images and specs
PATCH	/products/:id	Seller (owner)	Update product
DELETE	/products/:id	Seller (owner)	Soft‑delete product
POST	/products/:id/images	Seller (owner)	Add image to product
PATCH	/products/images/:imageId	Seller (owner)	Update image
DELETE	/products/images/:imageId	Seller (owner)	Remove image (cannot delete last/primary)
GET	/products/admin/all	ADMIN	All products (incl. soft‑deleted)
POST	/products/:id/restore	ADMIN	Restore soft‑deleted product
DELETE	/products/:id/permanent	ADMIN	Hard‑delete product + images + views
Analytics
Method	Endpoint	Access	Description
GET	/analytics/my-shop	Seller	Own shop’s products with view stats
GET	/analytics/my-shop/products/:id	Seller	Detailed views for one product
GET	/analytics/admin/overview	ADMIN	Platform totals, daily views, top‑5 products
Upload
Method	Endpoint	Access	Description
POST	/upload/image	Authenticated	Upload image (JPEG/PNG/WebP, max 5 MB) → returns Cloudinary URL

🧱 Project Structure (simplified)
src/
├── main.ts                 # Bootstrap: middleware, pipes, Swagger, CORS
├── app.module.ts           # Root module
├── prisma/
│   ├── prisma.module.ts    # Global Prisma module
│   └── prisma.service.ts   # Prisma client lifecycle
├── auth/                   # Auth module, service, guards, decorators, JWT
├── user/                   # User module, service, controller, DTOs
├── seller/                 # Seller module, service, controller, DTOs
├── category/               # Category module, service, controller, DTOs
├── product/                # Product module, service, controller, DTOs
├── analytics/              # Analytics module, service, controller, DTOs
├── upload/                 # Upload module, service, controller
├── cloudinary/             # Cloudinary provider + global module
├── dto/                    # Shared DTOs (user, product, category, etc.)
└── types/                  # Express custom types (if any)

🔐 Security
Helmet enabled for security headers.

Rate limiting – 100 requests per 15 minutes per IP.

CORS configured for frontend origins.

Cookies are httpOnly, sameSite: lax (production: secure: true).

ValidationPipe with whitelist and forbidNonWhitelisted prevents mass assignment.

Guards enforce JWT authentication and role‑based access.

Ownership checks in services ensure sellers can only modify their own products.

🧪 Testing
Use the provided Postman collection (not included, but you can build one from the endpoints above) or Swagger UI at /api/docs.

📌 Notes
Product price is in cents (integer). Frontend should format accordingly.

Image management expects an external URL (e.g., from Cloudinary). The upload endpoint provides that URL.

Soft‑delete is used for users, sellers, categories, and products. Hard‑delete cascades related data where enforced.

Theme for users accepts light, dark, sepia.

📄 License
MIT