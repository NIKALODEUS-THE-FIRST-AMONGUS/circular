# 🎓 Circular Management System

A modern, high-performance web application for managing institutional circulars and announcements.

**Status**: ✅ Production Ready | ⚠️ Performance Optimization Needed  
**Backend**: Firebase Firestore + Cloudinary  
**Frontend**: React + Vite + TailwindCSS

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📋 Project Status

**👉 See [PROJECT_STATUS.md](PROJECT_STATUS.md) for complete current status**

### Critical Actions Required
1. **Publish Firestore Rules** - App won't work without this!
   - Go to: https://console.firebase.google.com/project/circular2-15417/firestore/rules
   - Copy from `firestore.rules` and publish

2. **Optimize Performance** - Current score: 30/100
   - See `PERFORMANCE_FIXES_REQUIRED.md` for details

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Firebase Auth** - Authentication
- **Cloud Firestore** - Database
- **Cloudinary** - File storage
- **Firebase Hosting** - Deployment

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── lib/             # Firebase & utilities
│   ├── firebase-config.js
│   ├── firebase-db.js
│   └── cloudinary.js
├── hooks/           # Custom React hooks
├── context/         # React context providers
└── utils/           # Utility functions
```

---

## 🔧 Configuration

### Environment Variables
Create `.env` file:

```env
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=circular2-15417.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=circular2-15417
VITE_FIREBASE_STORAGE_BUCKET=circular2-15417.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=dzw0mxfzq
VITE_CLOUDINARY_UPLOAD_PRESET=circular-attachments
```

---

## 📚 Documentation

- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current project status
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - Migration from Supabase
- **[PERFORMANCE_FIXES_REQUIRED.md](PERFORMANCE_FIXES_REQUIRED.md)** - Performance guide
- **[FIREBASE_DEPLOYMENT_GUIDE.md](FIREBASE_DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[DATA_MIGRATION_GUIDE.md](DATA_MIGRATION_GUIDE.md)** - Data import guide
- **[docs/](docs/)** - Technical documentation

---

## ✨ Features

- ✅ User authentication (Email/Password, Google)
- ✅ Role-based access control (Admin, Teacher, Student)
- ✅ Circular creation and management
- ✅ File attachments (via Cloudinary)
- ✅ Real-time notifications
- ✅ Advanced filtering and search
- ✅ Bulk operations
- ✅ Audit logs
- ✅ Feedback system
- ✅ Multi-language support
- ✅ Dark/Light theme
- ✅ Mobile responsive

---

## 🎯 Performance

### Current Metrics
- Performance Score: 30/100
- First Contentful Paint: 15.3s
- Largest Contentful Paint: 47.2s
- Total Bundle Size: 8.8 MB

### Target Metrics
- Performance Score: 70-85/100
- First Contentful Paint: 1-2s
- Largest Contentful Paint: 2-3s
- Total Bundle Size: 3-4 MB

**See [PERFORMANCE_FIXES_REQUIRED.md](PERFORMANCE_FIXES_REQUIRED.md) for optimization guide**

---

## 🚀 Deployment

### Firebase Hosting
```bash
# Build
npm run build

# Deploy
firebase deploy
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## 🔒 Security

- Firebase Authentication
- Firestore Security Rules (see `firestore.rules`)
- Row-level security
- Input validation
- XSS protection
- CSRF protection

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to check code quality
5. Submit a pull request

---

## 📝 License

This project is proprietary and confidential.

---

## 🆘 Support

For issues or questions:
1. Check [PROJECT_STATUS.md](PROJECT_STATUS.md)
2. Review documentation in [docs/](docs/)
3. Check Firebase Console for errors
4. Review browser console for client errors

---

## 🎉 Acknowledgments

- Firebase for backend infrastructure
- Cloudinary for file storage
- React team for the amazing framework
- Vite for blazing fast builds

---

**Made with ❤️ for Methodist College of Engineering**
