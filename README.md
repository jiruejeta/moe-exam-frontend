# Online Examination Portal System

A complete secure online examination portal with admin and student roles, anti-cheating protections, and automated exam management.

## Features

### Admin Features
- Secure admin authentication
- Student management (CRUD operations)
- Department management
- Course management with auto-generated exam codes
- Question management (single & bulk upload)
- Result viewing and CSV export
- Dashboard with statistics

### Student Features
- Secure login with username/password
- Department-based exam access
- Fullscreen secure exam mode
- Tab switching detection
- Copy/paste prevention
- Right-click disable
- Question flagging
- Timer with auto-submit
- Auto-save answers
- Violation tracking (auto-submit after 3 violations)

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT with HTTP-only cookies
- **Security**: bcrypt password hashing

## Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your MongoDB URI
npm run dev