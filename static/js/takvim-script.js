document.addEventListener('DOMContentLoaded', async() => {
    // =================================================================
    // GÖREV DETAY MODALI SİSTEMİ
    // =================================================================
    const taskModal = document.getElementById('task-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskTextBody = document.getElementById('modal-task-text-body');
    const modalAssignedUser = document.getElementById('modal-assigned-user');
    const modalCreationDate = document.getElementById('modal-creation-date');
    const modalDueDate = document.getElementById('modal-due-date');
    const modalTaskDescription = document.getElementById('modal-task-description');
    const modalCommentsList = document.getElementById('modal-comments-list');
    const modalFilesList = document.getElementById('modal-files-list');
    let currentTaskId = null;

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'Belirtilmemiş';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleString('tr-TR', options);
    };

    const openTaskModal = async(taskId) => {
        currentTaskId = taskId;
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            if (!response.ok) throw new Error('Görev detayları alınamadı.');
            const task = await response.json();
            modalTaskTitle.textContent = "Görev Detayları";
            modalTaskTextBody.textContent = task.text;
            modalAssignedUser.textContent = task.assignedToUsername || 'Bilinmiyor';
            modalCreationDate.textContent = formatDate(task.creationDate, true);
            modalDueDate.textContent = formatDate(task.dueDate, false);
            modalTaskDescription.textContent = task.description || 'Bu görev için henüz bir açıklama girilmemiş.';

            modalCommentsList.innerHTML = '';
            if (task.comments && task.comments.length > 0) {
                task.comments.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'comment-item';
                    el.innerHTML = `<p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p><p class="comment-text">${c.text}</p>`;
                    modalCommentsList.appendChild(el);
                });
            } else { modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>'; }

            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(f => {
                    const el = document.createElement('div');
                    el.className = 'file-item';
                    el.innerHTML = `<a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a>`;
                    modalFilesList.appendChild(el);
                });
            } else { modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>'; }

            taskModal.style.display = 'flex';
        } catch (error) { console.error(error);
            alert('Görev detayları yüklenemedi.'); }
    };

    const closeTaskModal = () => { taskModal.style.display = "none";
        currentTaskId = null; };

    if (taskModal) {
        modalCloseBtn.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
    }

    // =================================================================
    // FULLCALENDAR KODU
    // =================================================================
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'tr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: '/api/calendar-tasks',
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // Tarayıcının varsayılan eylemini engelle
            const taskId = info.event.id;
            openTaskModal(taskId);
        }
    });
    calendar.render();

    // =================================================================
    // DİNAMİK SIDEBAR VE BİLDİRİM SİSTEMİ
    // =================================================================
    const sidebarMenu = document.getElementById('sidebar-menu');
    let currentUser = null;

    try {
        const response = await fetch('/api/initial_data');
        const data = await response.json();
        currentUser = data.currentUser;

        let menuItems = '';
        if (currentUser.role === 'admin') {
            menuItems = `
                <li class="menu-item" onclick="window.location.href='/dashboard'"><i class="fa-solid fa-chart-pie"></i> Dashboard</li>
                <li class="menu-item" onclick="window.location.href='/yonetici'"><i class="fa-solid fa-list"></i> Liste Görünümü</li>
                <li class="menu-item" onclick="window.location.href='/kanban'"><i class="fa-solid fa-table-columns"></i> Pano Görünümü</li>
                <li class="menu-item active" onclick="window.location.href='/takvim'"><i class="fa-solid fa-calendar-days"></i> Takvim</li>
                <li class="menu-item" onclick="window.location.href='/personel-yonetimi'"><i class="fa-solid fa-users-cog"></i> Personel Yönetimi</li>
                <li class="menu-item" onclick="window.location.href='/personnel-performance'"><i class="fa-solid fa-user-check"></i> Personel Performansı</li>
                <li id="logout-btn" class="menu-item logout-item"><i class="fa-solid fa-right-from-bracket"></i> Cikis Yap</li>
            `;
        } else {
            menuItems = `
                <li class="menu-item" onclick="window.location.href='/personel'"><i class="fa-solid fa-list"></i> Görev Listem</li>
                <li class="menu-item" onclick="window.location.href='/personel-kanban'"><i class="fa-solid fa-table-columns"></i> Görev Panom</li>
                <li class="menu-item active" onclick="window.location.href='/takvim'"><i class="fa-solid fa-calendar-days"></i> Takvimim</li>
                <li id="logout-btn" class="menu-item logout-item"><i class="fa-solid fa-right-from-bracket"></i> Cikis Yap</li>
            `;
        }
        sidebarMenu.innerHTML = menuItems;

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async() => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            });
        }
    } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
    }

    // --- BİLDİRİM KODU ---
    const notificationBell = document.getElementById('notification-bell');
    const notificationCounter = document.getElementById('notification-counter');
    const notificationDropdown = document.getElementById('notification-dropdown');

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
                    let timeText = diffSeconds < 60 ? 'şimdi' : diffMinutes < 60 ? `${diffMinutes} dakika önce` : diffHours < 24 ? `${diffHours} saat önce` : `${diffDays} gün önce`;
                    item.innerHTML = `<p>${n.message}</p><span class="notification-item-time">${timeText}</span>`;
                    notificationDropdown.appendChild(item);
                });
            }
        } catch (error) { console.error("Bildirimler alınırken hata oluştu:", error); }
    };
    if (notificationBell) {
        notificationBell.addEventListener('click', async() => {
            const isHidden = notificationDropdown.style.display === 'none';
            notificationDropdown.style.display = isHidden ? 'block' : 'none';
            if (isHidden && notificationCounter.style.display !== 'none' && parseInt(notificationCounter.textContent) > 0) {
                try {
                    await fetch('/api/notifications/mark-as-read', { method: 'POST' });
                    notificationCounter.style.display = 'none';
                    notificationCounter.textContent = '0';
                } catch (error) { console.error("Bildirimler okunmuş olarak işaretlenemedi:", error); }
            }
        });
        document.addEventListener('click', (event) => {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.style.display = 'none';
            }
        });
    }
    checkNotifications();
    setInterval(checkNotifications, 30000);
});