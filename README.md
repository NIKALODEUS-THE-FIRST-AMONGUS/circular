# Circular Management System

A modern, real-time institutional circular distribution platform built with React, Vite, and Supabase.

## ✨ Features

- 🔐 Secure authentication with role-based access control
- 📢 Real-time circular publishing and distribution
- 🎯 Targeted delivery (department, year, section)
- 🔔 Push notifications via Firebase Cloud Messaging
- 📱 Progressive Web App (PWA) support
- 🌓 Dark/Light theme with system preference detection
- 📊 Analytics, audit logging, and user management
- 🚀 Optimized performance with lazy loading and caching
- ♿ Accessibility compliant (WCAG guidelines)

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Notifications**: Firebase Cloud Messaging
- **Deployment**: Vercel (frontend), Supabase (backend)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Firebase project (for push notifications)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your credentials
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_FIREBASE_* (Firebase config)

# Run development server
npm run dev
```

### Database Setup

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## 📁 Project Structure

```
circular/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── context/        # React context providers
│   ├── lib/            # Supabase, Firebase config
│   └── utils/          # Utility functions
├── supabase/
│   ├── migrations/     # Database migrations
│   └── functions/      # Edge functions
├── docs/               # Documentation
└── public/             # Static assets
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔑 Key Features

### Role-Based Access Control
- **Admin**: Full system access, user management
- **Teacher**: Create/edit circulars, view analytics
- **Student**: View circulars, download attachments

### Auto-Approval System
- Automatic approval for @methodist.edu.in emails
- Pre-approval system for institutional provisioning
- Instant account creation or invite mode

### Notification System
- Real-time push notifications for new circulars
- Priority-based delivery (standard/important)
- Automatic token cleanup for invalid devices
- Foreground and background notification support

### Performance Optimizations
- Consolidated data fetching (single parallel queries)
- Image lazy loading and compression
- Virtual scrolling for large lists
- Adaptive timeouts based on network speed
- Service worker caching

## 📚 Documentation

All detailed documentation is available in the [`docs/`](./docs) folder:

- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Auto-Approval Setup](./docs/AUTO_APPROVAL_SETUP.md)
- [FCM Troubleshooting](./docs/FCM_TROUBLESHOOTING_GUIDE.md)
- [Pre-Launch Checklist](./docs/PRE_LAUNCH_CHECKLIST.md)
- [Complete Documentation Index](./docs/README.md)

## 🚢 Deployment

### Frontend (Vercel)

```bash
npm run build
vercel deploy --prod
```

### Edge Functions (Supabase)

```bash
supabase functions deploy send-circular-notification
supabase secrets set FCM_SERVER_KEY=your-firebase-server-key
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

For issues and questions:
- Check the [docs/](./docs) folder for detailed guides
- Review Supabase Dashboard logs
- Open an issue on GitHub

---

Built with ❤️ using React, Vite, and Supabase
