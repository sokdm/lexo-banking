let currentUser = null;

async function checkUser() {
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data.success) {
        currentUser = data.user;
        if (data.user.isLocked) {
            document.getElementById('lockedBanner').style.display = 'block';
            document.getElementById('transferForm').style.opacity = '0.5';
            document.getElementById('transferForm').style.pointerEvents = 'none';
        }
    } else {
        window.location.href = '/login';
    }
}

function showPinModal() {
    const bankName = document.getElementById('bankName').value;
    const recipientAccount = document.getElementById('recipientAccount').value;
    const recipientName = document.getElementById('recipientName').value;
    const amount = document.getElementById('amount').value;
    
    if (!bankName || !recipientAccount || !recipientName || !amount) {
        showNotification('Error', 'Please fill all fields', true);
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        showNotification('Error', 'Invalid amount', true);
        return;
    }
    
    document.getElementById('pinModal').style.display = 'flex';
}

function closePinModal() {
    document.getElementById('pinModal').style.display = 'none';
    document.getElementById('pinInput').value = '';
}

async function submitTransfer() {
    const pin = document.getElementById('pinInput').value;
    if (pin.length !== 4) {
        showNotification('Error', 'Enter 4-digit PIN', true);
        return;
    }
    
    const transferData = {
        bankName: document.getElementById('bankName').value,
        recipientAccount: document.getElementById('recipientAccount').value,
        recipientName: document.getElementById('recipientName').value,
        amount: document.getElementById('amount').value,
        pin: pin
    };
    
    try {
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transferData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closePinModal();
            showReceipt(data.receipt);
        } else {
            closePinModal();
            showNotification('Error', data.message, true);
        }
    } catch (error) {
        showNotification('Error', 'Network error', true);
    }
}

function showReceipt(receipt) {
    document.getElementById('transferForm').style.display = 'none';
    document.getElementById('receiptSection').style.display = 'block';
    
    // Show external warning if applicable
    if (receipt.isExternal) {
        document.getElementById('externalWarning').style.display = 'block';
    } else {
        document.getElementById('externalWarning').style.display = 'none';
    }
    
    document.getElementById('receiptId').textContent = receipt.receiptId;
    document.getElementById('receiptDate').textContent = new Date(receipt.date).toLocaleString();
    document.getElementById('receiptBank').textContent = receipt.bankName;
    document.getElementById('receiptRecipient').textContent = receipt.recipientName;
    document.getElementById('receiptAccount').textContent = receipt.recipientAccount;
    document.getElementById('receiptAmount').textContent = '$' + receipt.amount.toFixed(2);
}

function newTransfer() {
    document.getElementById('transferForm').style.display = 'block';
    document.getElementById('receiptSection').style.display = 'none';
    document.getElementById('recipientAccount').value = '';
    document.getElementById('recipientName').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('externalWarning').style.display = 'none';
}

function showNotification(title, message, isError) {
    const notif = document.getElementById('notification');
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifMessage').textContent = message;
    if (isError) notif.classList.add('error');
    else notif.classList.remove('error');
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

checkUser();
