async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = '/admin/login';
            return;
        }
        
        document.getElementById('totalUsers').textContent = data.users.length;
        document.getElementById('lockedUsers').textContent = data.users.filter(u => u.isLocked).length;
        
        const list = document.getElementById('userList');
        list.innerHTML = '';
        
        data.users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-item';
            item.innerHTML = `
                <div class="user-details">
                    <h3>${user.fullName}</h3>
                    <p>${user.phone} | Balance: $${user.balance.toFixed(2)}</p>
                    <p style="font-family: monospace; font-size: 0.8rem;">${user.accountNumber}</p>
                    ${user.isLocked ? '<span style="color: var(--danger); font-size: 0.8rem;"><i class="fas fa-lock"></i> LOCKED</span>' : ''}
                </div>
                <div class="user-actions">
                    <button class="btn-small ${user.isLocked ? 'btn-unlock' : 'btn-lock'}" onclick="toggleLock('${user.id}', ${!user.isLocked})">
                        <i class="fas fa-${user.isLocked ? 'unlock' : 'lock'}"></i>
                    </button>
                    <button class="btn-small" style="background: var(--secondary); color: white;" onclick="openSendMoney('${user.id}')">
                        <i class="fas fa-gift"></i>
                    </button>
                    <a href="/admin/support/${user.id}" class="btn-small btn-chat">
                        <i class="fas fa-comments"></i>
                    </a>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleLock(userId, lock) {
    const response = await fetch('/api/admin/lock-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lock })
    });
    const data = await response.json();
    showNotification(data.success ? 'Success' : 'Error', data.message, !data.success);
    if (data.success) loadUsers();
}

function openSendMoney(userId) {
    document.getElementById('sendMoneyUserId').value = userId;
    document.getElementById('sendMoneyModal').style.display = 'flex';
}

function closeSendMoneyModal() {
    document.getElementById('sendMoneyModal').style.display = 'none';
    document.getElementById('sendAmount').value = '';
}

async function confirmSendMoney() {
    const userId = document.getElementById('sendMoneyUserId').value;
    const amount = document.getElementById('sendAmount').value;
    const senderName = document.getElementById('senderName').value || 'Admin';
    
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('Error', 'Invalid amount', true);
        return;
    }
    
    const response = await fetch('/api/admin/send-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount, senderName })
    });
    
    const data = await response.json();
    showNotification(data.success ? 'Success' : 'Error', data.message, !data.success);
    if (data.success) {
        closeSendMoneyModal();
        loadUsers();
    }
}

async function logout() {
    await fetch('/api/logout');
    window.location.href = '/admin/login';
}

function showNotification(title, message, isError) {
    const notif = document.getElementById('notification');
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifMessage').textContent = message;
    notif.classList.toggle('error', isError);
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

loadUsers();
setInterval(loadUsers, 5000);
