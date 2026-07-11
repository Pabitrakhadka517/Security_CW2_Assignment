
<<<<<<< HEAD

# 🌟 **Epasaley – E-Commerce Backend**

Epasaley is a **complete backend system** built for modern e-commerce platforms.
It provides everything required to run an online store — products, categories, banners, flash sales, coupons, orders, and more.

This backend is built to be:

* **Fast**
* **Secure**
* **Reliable**
* **Easy to extend**
* **Ready for real-world usage**


## 🚀 **What This Backend Can Do**

### 🛍️ Products

Add, update, delete, and display products with full details, pricing, discounts, and stock.

### 🗂️ Categories

Organize products into meaningful categories for easier browsing.

### 🎏 Banners

Display promotional banners for offers, sales, and events.

### 💸 Coupons

Create discount coupons, validate them, and apply them during checkout.

### ⚡ Flash Sales

Run limited-time flash sales with custom stock and pricing.

### 📦 Orders

Customers can place orders, and admins can manage them easily — update status, view stats, track users, etc.

### 👤 Authentication

Secure login system using tokens for:

* Customers
* Admins (separate access & control)

### 📸 Image Upload

Upload product and banner images using Cloudinary.

### 🔎 Search, Filter & Pagination

Products can be:

* Searched
* Sorted
* Filtered
* Paginated

Makes browsing fast and smooth.


## 🧱 **How It Is Built**

* Backend: **Node.js + Express.js**
* Database: **MongoDB**
* Authentication: **JWT (JSON Web Tokens)**
* Image Storage: **Cloudinary**
* Language: **TypeScript**
* Architecture: Clean, modular, service-based








## 🚀 **Why This Backend Is Production-Ready**

* Secure authentication
* Error handling
* Validations
* Performance optimizations
* Scalable architecture
* Cloud image support
* Clean folder structure


## 📄 **License**

This project is released under the **ISC License**, allowing open usage and modification.


## ⚙️ CORS Configuration (for local dev and production)

The server allows configuring allowed origins via the `CORS_ORIGINS` environment variable. This is required when the frontend sends credentials (cookies) — browsers block requests with `credentials` if the server responds with `Access-Control-Allow-Origin: *`.

How to set it on Render (or any host that exposes environment variables):

- Example values:
	- Local dev: `http://localhost:5174`
	- Production frontend: `https://your-frontend-domain.com`
- Combine multiple origins separated by commas:
	- `CORS_ORIGINS="http://localhost:5174,https://frontend.example.com"`

Steps for Render:

1. Go to your Render service for the backend.
2. Open the **Environment** tab.
3. Add a new variable `CORS_ORIGINS` and set its value to the comma-separated origin list.
4. Redeploy the service.

Notes:
- In development, the frontend code defaults to a relative API base so the Vite dev proxy can forward `/api/v1` requests to the remote backend (see frontend Vite config).
- The server will echo back the validated `Origin` as `Access-Control-Allow-Origin` and will set `Access-Control-Allow-Credentials: true` when the origin is allowed.


=======
>>>>>>> 2c2c863173173d7de050db6af1c4df25f5c749fb
