# Quick Start Guide - Login with Backend User

## Step 1: Create Admin User in Backend

First, create a factory admin user in the backend:

```bash
cd backend
node createAdmin.js
```

This will create a user with:
- **Email**: `admin@sunlife.com`
- **Password**: `password`
- **Role**: `FACTORY_ADMIN`

If the user already exists, the script will tell you the credentials.

## Step 2: Start Backend Server

Make sure the backend is running:

```bash
cd backend
npm run dev
```

The backend should be running on `http://localhost:5050`

## Step 3: Start Frontend

In a new terminal:

```bash
cd frontend
npm install  # If you haven't already
npm run dev
```

The frontend should be running on `http://localhost:5173` (or another port)

## Step 4: Login

1. Open your browser and go to `http://localhost:5173` (or the port shown in terminal)
2. You'll see the login page
3. Enter:
   - **Email**: `admin@sunlife.com`
   - **Password**: `password`
4. Click "Sign in"

You should be redirected to the Factory Admin dashboard at `/factory/dealers`

## Creating Other Users

### Factory Admin can create:
- **Dealers**: Use the "Dealers" page in Factory Admin dashboard
- **Service Centers**: Use the "Service Centers" API endpoint (or create via backend script)

### Dealers can create:
- **Sub-Dealers**: Use the "Sub-Dealers" page in Dealer dashboard

## Test Users from Seed Script

If you run the seed script (`backend/src/utils/seedUsers.js`), you'll get:

1. **Factory Admin**
   - Email: `admin@sunlife.com`
   - Password: `admin123`

2. **Service Center**
   - Email: `service@sunlife.com`
   - Password: `service123`

## Troubleshooting

### Login fails with "Invalid credentials"
- Make sure the backend server is running
- Check that the user exists in the database
- Verify the password is correct
- Check browser console for API errors

### CORS errors
- Make sure backend has CORS enabled (it should be in `app.js`)
- Check that frontend is calling the correct API URL (check `.env` file)

### 401 Unauthorized
- Token might be expired, try logging in again
- Check that JWT_SECRET is set in backend `.env`
