# 🚀 WA Bulk Sender Template

A clean and modern fullstack template for **WhatsApp bulk message sending**, built with **Node.js + Baileys + React + Socket.IO + MongoDB**.  
Built by [Guru322](https://github.com/Guru322) — because risky code is fun, but scalable code is 🔥.

---

### ✨ Features
- ✅ WhatsApp Pairing via Phone Number
- ✅ Real-time message sending status with Socket.IO
- ✅ MongoDB storage for messages, contacts, and authentication
- ✅ Persistent sessions across server restarts
- ✅ Translucent glass UI on a background image
- ✅ Delay between messages (anti-ban friendly)
- ✅ Clean frontend/backend folder structure
- ✅ One-socket architecture (no multiple risky socket spam)

---

### 📁 Project Structure
```
wa-bulk-sender-template/
├── client/                  # React frontend
│   └── src/
│       └── components/
│           ├── LoginPage.jsx
│           └── MessageSender.jsx
├── services/                # Backend services
│   └── WhatsAppSocketManager.js  # WhatsApp connection manager
├── utils/                   # Utility modules
│   ├── mongo-connection.js  # MongoDB connection manager
│   ├── mongoauth.js         # WhatsApp auth state in MongoDB
│   └── store.js             # MongoDB store for WhatsApp data
├── guru.js                  # WhatsApp logic (pairing & messaging)
├── index.js                 # Express server + socket.io
├── package.json             # Backend dependencies & scripts
└── README.md                # This file 😎
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

#### 4️⃣ Install backend dependencies
```bash
npm install
```

#### 5️⃣ Setup frontend
```bash
cd client
npm install
npm run build
```

Frontend React build will automatically be served from Express.

---

### 🏃 Start the Project
```bash
npm start
```
- Backend runs on **port 3000**
- Frontend is served from `/client/build`
- MongoDB stores all WhatsApp data and sessions
- WebSocket auto-connects when user initiates pairing

---

### 🔌 API Endpoints
| Route | Description |
|-------|-------------|
| `GET /pair?number=91XXXXXXXXXX` | Pair WhatsApp session |
| `POST /pair/send-messages` | Send messages to list of numbers |

---

### 💡 Usage Notes
- Enter phone numbers in the format:  
  ```
  919876543210  
  919123456789
  ```
- Messages are sent with a **30-second delay per number** (can be changed in code).
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