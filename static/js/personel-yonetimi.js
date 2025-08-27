document.addEventListener('DOMContentLoaded', () => {
    const personnelList = document.getElementById('personnel-list');
    const addForm = document.getElementById('add-personnel-form');
    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const errorMessage = document.getElementById('add-user-error');
    const logoutBtn = document.getElementById('logout-btn');

    const api = {
        get: async() => (await fetch('/api/personnel')).json(),
        add: async(username, password) => await fetch('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }),
        delete: async(id) => await fetch(`/api/personnel/${id}`, { method: 'DELETE' }),
        update: async(id, data) => await fetch(`/api/personnel/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    };

    const render = async() => {
        const personnel = await api.get();
        personnelList.innerHTML = '';
        personnel.forEach(user => {
            const li = document.createElement('li');
            li.className = 'personnel-list-item';
            li.dataset.id = user.id;
            li.innerHTML = `
                <div class="personnel-info">
                    <span class="personnel-username">${user.username}</span>
                </div>
                <div class="personnel-controls">
                    <button class="edit-personnel-btn"><i class="fa-solid fa-pencil"></i></button>
                    <button class="delete-personnel-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            personnelList.appendChild(li);
        });
    };

    const toggleEditMode = (item) => {
        const userId = item.dataset.id;
        const originalUsername = item.querySelector('.personnel-username').textContent;
        item.classList.add('editing');
        item.innerHTML = `
            <div class="personnel-info-edit">
                <input type="text" class="edit-username-input" value="${originalUsername}">
                <input type="text" class="edit-password-input" placeholder="Yeni Şifre (değişmeyecekse boş bırakın)">
            </div>
            <div class="personnel-controls-edit">
                <button class="save-personnel-btn edit-btn-action">Kaydet</button>
                <button class="cancel-personnel-btn edit-btn-action">İptal</button>
            </div>`;
        item.querySelector('.save-personnel-btn').addEventListener('click', async() => {
            const newUsername = item.querySelector('.edit-username-input').value.trim();
            const newPassword = item.querySelector('.edit-password-input').value.trim();
            if (!newUsername) return alert('Kullanıcı adı boş olamaz.');
            const updates = { username: newUsername };
            if (newPassword) updates.password = newPassword;
            const response = await api.update(userId, updates);
            if (response.ok) {
                await render();
            } else {
                const data = await response.json();
                alert(data.message || 'Güncelleme başarısız oldu.');
            }
        });
        item.querySelector('.cancel-personnel-btn').addEventListener('click', render);
    };

    personnelList.addEventListener('click', (e) => {
        const item = e.target.closest('.personnel-list-item');
        if (!item || item.classList.contains('editing')) return;
        if (e.target.closest('.delete-personnel-btn')) {
            if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
                api.delete(item.dataset.id).then(render);
            }
        }
        if (e.target.closest('.edit-personnel-btn')) {
            toggleEditMode(item);
        }
    });

    addForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const username = newUsernameInput.value.trim();
        const password = newPasswordInput.value.trim();
        if (!username || !password) return alert('Kullanıcı adı ve şifre boş olamaz.');
        const response = await api.add(username, password);
        if (response.ok) {
            addForm.reset();
            errorMessage.style.display = 'none';
            await render();
        } else {
            errorMessage.textContent = (await response.json()).message || 'Bir hata oluştu.';
            errorMessage.style.display = 'block';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }
    // =========================================================================
    // === BİLDİRİM SİSTEMİ KODU BAŞLANGICI ===
    // =========================================================================
    const notificationBell = document.getElementById('notification-bell');
    const notificationCounter = document.getElementById('notification-counter');
    const notificationDropdown = document.getElementById('notification-dropdown');

    // Bildirimleri kontrol eden fonksiyon
    const checkNotifications = async() => {
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) return;

            const notifications = await response.json();

            if (notifications.length > 0) {
                notificationCounter.textContent = notifications.length;
                notificationCounter.style.display = 'block';
            } else {
                notificationCounter.style.display = 'none';
            }

            notificationDropdown.innerHTML = '<div class="notification-dropdown-header">Bildirimler</div>';
            if (notifications.length === 0) {
                notificationDropdown.innerHTML += '<div class="no-notifications">Okunmamış bildiriminiz yok.</div>';
            } else {
                notifications.forEach(n => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';

                    const notificationDate = new Date(n.timestamp);
                    const now = new Date();
                    const diffSeconds = Math.round((now - notificationDate) / 1000);
                    const diffMinutes = Math.round(diffSeconds / 60);
                    const diffHours = Math.round(diffMinutes / 60);
                    const diffDays = Math.round(diffHours / 24);

                    let timeText = '';
                    if (diffSeconds < 60) {
                        timeText = 'şimdi';
                    } else if (diffMinutes < 60) {
                        timeText = `${diffMinutes} dakika önce`;
                    } else if (diffHours < 24) {
                        timeText = `${diffHours} saat önce`;
                    } else {
                        timeText = `${diffDays} gün önce`;
                    }

                    item.innerHTML = `
                    <p>${n.message}</p>
                    <span class="notification-item-time">${timeText}</span>
                `;
                    notificationDropdown.appendChild(item);
                });
            }

        } catch (error) {
            console.error("Bildirimler alınırken hata oluştu:", error);
        }
    };

    // Çan ikonuna tıklama olayı
    if (notificationBell) {
        notificationBell.addEventListener('click', async() => {
            const isHidden = notificationDropdown.style.display === 'none';
            notificationDropdown.style.display = isHidden ? 'block' : 'none';

            if (isHidden && notificationCounter.style.display !== 'none' && parseInt(notificationCounter.textContent) > 0) {
                try {
                    await fetch('/api/notifications/mark-as-read', { method: 'POST' });
                    // Sayaç hemen gizlenir, bir sonraki kontrolde zaten sıfır gelecektir.
                    notificationCounter.style.display = 'none';
                    notificationCounter.textContent = '0';
                } catch (error) {
                    console.error("Bildirimler okunmuş olarak işaretlenemedi:", error);
                }
            }
        });

        // Dropdown dışına tıklandığında kapat
        document.addEventListener('click', (event) => {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.style.display = 'none';
            }
        });
    }
    checkNotifications();
    setInterval(checkNotifications, 30000);
    render();
});