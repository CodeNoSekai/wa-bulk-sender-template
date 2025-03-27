# 🚀 WA Bulk Sender Template

A clean and modern fullstack template for **WhatsApp bulk message sending**, built with **Node.js + Baileys + React + Socket.IO + MongoDB**.  
Built by [Guru322](https://github.com/Guru322).

---

### ✨ Features
- ✅ WhatsApp Pairing via Phone Number
- ✅ Real-time message sending status with Socket.IO
- ✅ MongoDB storage for messages, contacts, and authentication
- ✅ Persistent sessions across server restarts
- ✅ Translucent glass UI with animated background
- ✅ Delay between messages
- ✅ Clean frontend/backend folder structure
- ✅ Multiple message types 
- ✅ GitHub authentication for secure access

---

### 📁 Project Structure
```
wa-bulk-sender-template/
├── client/                  # React frontend
│   └── src/
│       ├── components/
│       │   ├── LoginPage.jsx         # WhatsApp pairing screen
│       │   ├── MessageSender.jsx     # Main message sending interface
│       │   └── LandingPage.jsx       # GitHub auth landing page
│       ├── App.jsx                   # React app entry point
│       └── firebase.js               # Firebase auth configuration
├── services/                # Backend services
│   ├── WhatsAppSocketManager.js  # WhatsApp connection manager
│   └── MessageService.js         # Message sending logic
├── utils/                   # Utility modules
│   ├── mongo-connection.js  # MongoDB connection manager
│   ├── mongoauth.js         # WhatsApp auth state in MongoDB
│   └── store.js             # MongoDB store for WhatsApp data
├── guru.js                  # WhatsApp logic (pairing & messaging)
├── index.js                 # Express server + socket.io
├── package.json             # Backend dependencies & scripts
└── README.md                # This file 
```

---

### 🔧 Installation

#### 1️⃣ Clone this repo
```bash
git clone https://github.com/Guru322/wa-bulk-sender-template.git
cd wa-bulk-sender-template
```

#### 2️⃣ Install MongoDB
Make sure MongoDB is installed and running. You can use:
- Local MongoDB installation
- Docker container
- MongoDB Atlas cloud service

#### 3️⃣ Configure environment variables
Create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=whatsapp_auth
```

#### 4️⃣ Set up Firebase Authentication
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable GitHub authentication in the Firebase console
3. Create a client/.env file with the following Firebase config:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### 5️⃣ Install backend dependencies
```bash
npm install
```

#### 6️⃣ Setup frontend
```bash
cd client
npm install
npm run build
```

Frontend React build will automatically be served from Express.

#### 7️⃣ Docker deployment (optional)
The project includes a Dockerfile for containerized deployment:
```bash
docker build -t wa-bulk-sender .
docker run -p 3000:3000 -e MONGODB_URI=your_mongodb_uri wa-bulk-sender
```

---

### 🏃 Start the Project
```bash
npm start        # Production mode
npm run dev      # Development mode (with hot reload)
```
- Backend runs on **port 3000**
- Frontend is served from `/client/build`
- MongoDB stores all WhatsApp data and sessions
- WebSocket auto-connects when user initiates pairing

---

### 🔌 API Endpoints
| Route | Method | Description |
|-------|--------|-------------|
| `/pair?number=91XXXXXXXXXX` | GET | Pair WhatsApp session |
| `/pair/send-messages` | POST | Send interactive messages with buttons |
| `/pair/send-simple-messages` | POST | Send plain text messages |
| `/pair/send-shop-messages` | POST | Send shop-style messages with media |

---

### 💡 Usage Notes
- Enter phone numbers in the format:  
  ```
  919876543210  
  919123456789
  ```
- Messages are sent with a **10-second delay** between each number (can be configured in MessageService.js)
- Status updates appear live in frontend console via WebSocket.
- All data is persistently stored in MongoDB (messages, contacts, authentication)

---

### 📸 UI Preview

![image](https://github.com/user-attachments/assets/d0231094-b2cf-400b-ba06-fc943d107dba)

---

### 🤝 Credits
Built with ❤️ by [GURU](https://github.com/Guru322)

---

### 📢 Star this repo if you liked it ✨  
More tools & templates coming soon 🔥

---

### ⚠️ Disclaimer
WhatsApp is a trademark of WhatsApp LLC (owned by Meta). This project is not affiliated with or endorsed by WhatsApp or Meta.

This tool is provided as open-source software for legitimate business communication purposes. Please do not use this tool for spamming or any activities that violate WhatsApp's Terms of Service. The developer assumes no responsibility for misuse of this software.

This project is released under Apache License 2.0, allowing you to use, modify, and distribute it according to the license terms.
