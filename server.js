const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// DATA FILES
const USERS_FILE = './data/users.json';
const TRANSACTIONS_FILE = './data/transactions.json';
const CHATS_FILE = './data/chats.json';
const ADMIN_FILE = './data/admin.json';

// INITIALIZE DATA FILES
function initDataFiles() {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    if (!fs.existsSync(TRANSACTIONS_FILE)) fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([]));
    if (!fs.existsSync(CHATS_FILE)) fs.writeFileSync(CHATS_FILE, JSON.stringify([]));
    if (!fs.existsSync(ADMIN_FILE)) {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify({
            email: 'wsdmpresh@gmail.com',
            password: bcrypt.hashSync('Wisdomfx22a', 10),
            name: 'Williams'
        }));
    }
}
initDataFiles();

// MIDDLEWARE
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'lexo-banking-secret-2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// VIEW ENGINE SETUP
app.set('views', path.join(__dirname, 'views'));

// HELPER FUNCTIONS
function loadUsers() { 
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) { return []; }
}
function saveUsers(users) { 
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); 
}
function loadTransactions() { 
    try {
        return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE));
    } catch (e) { return []; }
}
function saveTransactions(transactions) { 
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2)); 
}
function loadChats() { 
    try {
        return JSON.parse(fs.readFileSync(CHATS_FILE));
    } catch (e) { return []; }
}
function saveChats(chats) { 
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2)); 
}
function loadAdmin() { 
    try {
        return JSON.parse(fs.readFileSync(ADMIN_FILE));
    } catch (e) { 
        return {
            email: 'wsdmpresh@gmail.com',
            password: bcrypt.hashSync('Wisdomfx22a', 10),
            name: 'Williams'
        };
    }
}

function generateAccountNumber() {
    return 'LEX' + Math.floor(1000000000 + Math.random() * 9000000000);
}

// ROUTES - PAGES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'welcome.html'));
});

app.get('/create-account', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'create-account.html'));
});

app.get('/create-pin', (req, res) => {
    if (!req.session.tempUser) return res.redirect('/create-account');
    res.sendFile(path.join(__dirname, 'views', 'create-pin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/transfer', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'transfer.html'));
});

app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/history', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

app.get('/support', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'support.html'));
});

app.get('/cards', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'cards.html'));
});

// ADMIN ROUTES
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/admin/support/:userId', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    res.sendFile(path.join(__dirname, 'views', 'admin-support.html'));
});

// API ROUTES - USER
app.post('/api/register', async (req, res) => {
    const { phone, password, fullName } = req.body;
    const users = loadUsers();
    
    if (users.find(u => u.phone === phone)) {
        return res.json({ success: false, message: 'Phone number already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const accountNumber = generateAccountNumber();
    
    const newUser = {
        id: uuidv4(),
        phone,
        password: hashedPassword,
        fullName,
        accountNumber,
        balance: 0,
        pin: null,
        isLocked: false,
        createdAt: new Date().toISOString(),
        notifications: []
    };
    
    req.session.tempUser = newUser;
    res.json({ success: true, message: 'Proceed to create PIN' });
});

app.post('/api/create-pin', async (req, res) => {
    const { pin } = req.body;
    if (!req.session.tempUser) return res.json({ success: false, message: 'Session expired' });
    
    const users = loadUsers();
    const newUser = req.session.tempUser;
    newUser.pin = bcrypt.hashSync(pin, 10);
    
    users.push(newUser);
    saveUsers(users);
    
    req.session.user = newUser;
    delete req.session.tempUser;
    
    res.json({ success: true, message: 'Account created successfully' });
});

app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.phone === phone);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    if (user.isLocked) {
        return res.json({ success: false, message: 'Account is locked. Contact support.' });
    }
    
    req.session.user = user;
    res.json({ success: true, message: 'Login successful' });
});

app.post('/api/transfer', async (req, res) => {
    const { recipientAccount, recipientName, bankName, amount, pin } = req.body;
    const users = loadUsers();
    const sender = users.find(u => u.id === req.session.user.id);
    
    if (sender.isLocked) {
        return res.json({ success: false, message: 'Your account is locked. Cannot make transfers.' });
    }
    
    if (!(await bcrypt.compare(pin, sender.pin))) {
        return res.json({ success: false, message: 'Invalid PIN' });
    }
    
    const transferAmount = parseFloat(amount);
    if (sender.balance < transferAmount) {
        return res.json({ success: false, message: 'Insufficient balance' });
    }
    
    const recipient = users.find(u => u.accountNumber === recipientAccount);
    
    sender.balance -= transferAmount;
    
    const transaction = {
        id: uuidv4(),
        senderId: sender.id,
        senderName: sender.fullName,
        senderAccount: sender.accountNumber,
        recipientAccount: recipientAccount,
        recipientName: recipientName,
        bankName: bankName || 'Lexo Bank',
        amount: transferAmount,
        type: 'transfer',
        status: 'completed',
        date: new Date().toISOString(),
        receiptId: 'RCP' + Date.now(),
        isExternal: !recipient
    };
    
    if (recipient) {
        recipient.balance += transferAmount;
        transaction.recipientId = recipient.id;
        
        io.emit('notification', {
            userId: recipient.id,
            message: `Received $${transferAmount} from ${sender.fullName}`,
            type: 'credit',
            amount: transferAmount
        });
    } else {
        transaction.recipientId = 'external';
    }
    
    const transactions = loadTransactions();
    transactions.push(transaction);
    saveTransactions(transactions);
    saveUsers(users);
    
    req.session.user = sender;
    
    res.json({ 
        success: true, 
        message: recipient ? 'Transfer successful' : 'Transfer to external bank successful',
        receipt: transaction
    });
});

app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.json({ success: false });
    const users = loadUsers();
    const user = users.find(u => u.id === req.session.user.id);
    res.json({ success: true, user });
});

app.get('/api/history', (req, res) => {
    if (!req.session.user) return res.json({ success: false });
    const transactions = loadTransactions();
    const userHistory = transactions.filter(t => 
        t.senderId === req.session.user.id || 
        t.recipientId === req.session.user.id ||
        (t.recipientId === 'external' && t.senderId === req.session.user.id)
    );
    res.json({ success: true, history: userHistory });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ADMIN API
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = loadAdmin();
    
    if (email !== admin.email || !(await bcrypt.compare(password, admin.password))) {
        return res.json({ success: false, message: 'Invalid admin credentials' });
    }
    
    req.session.admin = admin;
    res.json({ success: true });
});

app.get('/api/admin/users', (req, res) => {
    if (!req.session.admin) return res.json({ success: false });
    const users = loadUsers();
    res.json({ success: true, users });
});

app.post('/api/admin/lock-user', (req, res) => {
    if (!req.session.admin) return res.json({ success: false });
    const { userId, lock } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
        user.isLocked = lock;
        saveUsers(users);
        res.json({ success: true, message: `User ${lock ? 'locked' : 'unlocked'} successfully` });
    } else {
        res.json({ success: false, message: 'User not found' });
    }
});

app.post('/api/admin/send-money', (req, res) => {
    if (!req.session.admin) return res.json({ success: false });
    const { userId, amount, senderName } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
        const creditAmount = parseFloat(amount);
        user.balance += creditAmount;
        
        const transaction = {
            id: uuidv4(),
            senderId: 'admin',
            senderName: senderName || 'Admin',
            senderAccount: 'ADMIN',
            recipientId: user.id,
            recipientName: user.fullName,
            recipientAccount: user.accountNumber,
            amount: creditAmount,
            type: 'credit',
            status: 'completed',
            date: new Date().toISOString()
        };
        
        const transactions = loadTransactions();
        transactions.push(transaction);
        saveTransactions(transactions);
        saveUsers(users);
        
        io.emit('notification', {
            userId: user.id,
            message: `Received $${creditAmount} from ${senderName || 'Admin'}`,
            type: 'credit',
            amount: creditAmount
        });
        
        res.json({ success: true, message: 'Money sent successfully' });
    } else {
        res.json({ success: false, message: 'User not found' });
    }
});

// SOCKET.IO FOR CHAT
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-chat', (userId) => {
        socket.userId = userId;
        socket.join(userId);
    });
    
    socket.on('send-message', (data) => {
        const { senderId, recipientId, message, senderType } = data;
        const chats = loadChats();
        
        const chatMessage = {
            id: uuidv4(),
            senderId,
            recipientId,
            message,
            senderType,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        chats.push(chatMessage);
        saveChats(chats);
        
        io.to(recipientId).emit('new-message', chatMessage);
        io.to(senderId).emit('message-sent', chatMessage);
    });
    
    socket.on('get-messages', (data) => {
        const { userId, chatWith } = data;
        const chats = loadChats();
        const messages = chats.filter(c => 
            (c.senderId === userId && c.recipientId === chatWith) ||
            (c.senderId === chatWith && c.recipientId === userId)
        );
        socket.emit('chat-history', messages);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lexo Banking Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
