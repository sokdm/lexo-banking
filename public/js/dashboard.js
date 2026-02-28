const socket = io();
let currentUser = null;
let balanceHidden = false;

function setGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning,';
    if (hour >= 12) greeting = 'Good afternoon,';
    if (hour >= 17) greeting = 'Good evening,';
    document.getElementById('greetingText').textContent = greeting;
}

// Format number with commas
function formatMoney(amount) {
    return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('userName').textContent = data.user.fullName;
            document.getElementById('balanceDisplay').textContent = formatMoney(data.user.balance);
            document.getElementById('accountNumber').textContent = data.user.accountNumber;
            document.getElementById('modalAccount').textContent = data.user.accountNumber;
            
            if (data.user.isLocked) {
                showNotification('Warning', 'Account locked!', true);
            }
            
            socket.emit('join-chat', data.user.id);
            loadTransactions();
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        
        const list = document.getElementById('transactionsList');
        
        if (!data.success || data.history.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No transactions yet</p>';
            return;
        }
        
        list.innerHTML = '';
        const recent = data.history.slice(-4).reverse();
        
        recent.forEach(tx => {
            const isReceived = tx.recipientId === currentUser.id;
            const isAdmin = tx.senderId === 'admin';
            
            let iconClass, icon, title, amountClass, amountPrefix;
            
            if (isReceived) {
                iconClass = isAdmin ? 'gift' : 'credit';
                icon = isAdmin ? 'fa-gift' : 'fa-arrow-down';
                title = 'From ' + tx.senderName;
                amountClass = 'credit';
                amountPrefix = '+';
            } else {
                iconClass = 'debit';
                icon = 'fa-arrow-up';
                title = 'To ' + tx.recipientName;
                amountClass = 'debit';
                amountPrefix = '-';
            }
            
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = 
                '<div class="tx-icon ' + iconClass + '"><i class="fas ' + icon + '"></i></div>' +
                '<div class="tx-details">' +
                    '<div class="tx-title">' + title + '</div>' +
                    '<div class="tx-subtitle">' + (tx.bankName || 'Lexo Bank') + '</div>' +
                '</div>' +
                '<div class="tx-amount">' +
                    '<div class="amount ' + amountClass + '">' + amountPrefix + formatMoney(tx.amount) + '</div>' +
                    '<div class="time">' + new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + '</div>' +
                '</div>';
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function toggleBalance() {
    const display = document.getElementById('balanceDisplay');
    const eyeIcon = document.getElementById('eyeIcon');
    const hideText = document.getElementById('hideText');
    
    if (balanceHidden) {
        display.textContent = formatMoney(currentUser.balance);
        eyeIcon.className = 'fas fa-eye';
        hideText.textContent = 'Hide';
    } else {
        display.textContent = '****';
        eyeIcon.className = 'fas fa-eye-slash';
        hideText.textContent = 'Show';
    }
    balanceHidden = !balanceHidden;
}

function copyAccount() {
    if (currentUser) {
        navigator.clipboard.writeText(currentUser.accountNumber);
        showNotification('Copied!', 'Account number copied', false);
    }
}

function showReceive() {
    document.getElementById('receiveModal').style.display = 'flex';
}

function showNotification(title, message, isError) {
    const notif = document.getElementById('notification');
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifMessage').textContent = message;
    
    const icon = notif.querySelector('.notif-icon');
    icon.className = isError ? 'fas fa-exclamation-circle notif-icon' : 'fas fa-check-circle notif-icon';
    
    if (isError) notif.classList.add('error');
    else notif.classList.remove('error');
    
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

socket.on('notification', (data) => {
    if (data.userId === currentUser?.id) {
        showNotification('New Transaction', data.message, false);
        loadUserData();
    }
});

setGreeting();
loadUserData();
