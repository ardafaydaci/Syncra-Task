/* ====================================================================== */
/* === static/js/takvim-script.js (TUTARLILIK VE HATA GİDERME İÇİN GÜNCELLENDİ) === */
/* ====================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // Global değişkenler ve yardımcı fonksiyonlar
    const taskModal = document.getElementById('task-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'Belirtilmemiş';
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleString('tr-TR', options);
    };

    // =================================================================
    // GÖREV DETAY MODALI FONKSİYONLARI
    // =================================================================
    const openTaskModal = async(taskId) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            if (!response.ok) throw new Error('Görev detayları alınamadı.');
            const task = await response.json();

            document.getElementById('modal-task-title').textContent = "Görev Detayları";
            document.getElementById('modal-task-text-body').textContent = task.text;
            document.getElementById('modal-assigned-user').textContent = (task.assignedToUsernames || ['Bilinmiyor']).join(', ');
            document.getElementById('modal-creation-date').textContent = formatDate(task.creationDate, true);
            document.getElementById('modal-due-date').textContent = formatDate(task.dueDate, false);
            document.getElementById('modal-task-description').textContent = task.description || 'Bu görev için henüz bir açıklama girilmemiş.';

            const modalCommentsList = document.getElementById('modal-comments-list');
            modalCommentsList.innerHTML = '';
            if (task.comments && task.comments.length > 0) {
                task.comments.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'comment-item';
                    el.innerHTML = `<p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p><p class="comment-text">${c.text}</p>`;
                    modalCommentsList.appendChild(el);
                });
            } else {
                modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>';
            }

            const modalFilesList = document.getElementById('modal-files-list');
            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(f => {
                    const el = document.createElement('div');
                    el.className = 'file-item';
                    el.innerHTML = `<a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a>`;
                    modalFilesList.appendChild(el);
                });
            } else {
                modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>';
            }

            const activityLogContainer = document.querySelector('.activity-log-container');
            if (task.activity_log) {
                activityLogContainer.style.display = 'block';
                const modalActivityLog = document.getElementById('modal-activity-log');
                modalActivityLog.innerHTML = '';
                task.activity_log.slice().reverse().forEach(log => {
                    const li = document.createElement('li');
                    li.className = 'activity-log-item';
                    li.innerHTML = `<span class="log-user">${log.user}</span> ${log.action} <span class="log-time">${formatDate(log.timestamp, true)}</span>`;
                    modalActivityLog.appendChild(li);
                });
            } else {
                activityLogContainer.style.display = 'none';
            }

            taskModal.style.display = 'flex';
        } catch (error) {
            console.error(error);
            alert('Görev detayları yüklenemedi.');
        }
    };

    const closeTaskModal = () => {
        if (taskModal) taskModal.style.display = "none";
    };

    if (taskModal) {
        modalCloseBtn.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (event) => {
            if (event.target === taskModal) closeTaskModal();
        });
    }

    // Çıkış butonu
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', {
                method: 'POST'
            });
            window.location.href = '/';
        });
    }

    // =================================================================
    // FULLCALENDAR BAŞLATMA
    // =================================================================
    const initializeCalendar = () => {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error("Takvim elementi bulunamadı!");
            return;
        }

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
                info.jsEvent.preventDefault();
                const eventId = info.event.id;

                // === GÜNCELLEME BURADA ===
                // Etkinliğin bir görev mi yoksa doğum günü mü olduğunu kontrol et
                // Sadece görevler için modalı aç
                if (eventId && !String(eventId).startsWith('birthday-')) {
                    openTaskModal(eventId);
                }
                // Doğum günüyse hiçbir şey yapma
            }
        });

        calendar.render();
    };
    const checkNotifications = async() => {
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) return;
            const notifications = await response.json();
            const notificationCounter = document.getElementById('notification-counter');
            const notificationDropdown = document.getElementById('notification-dropdown');

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
        } catch (error) {
            console.error("Bildirimler alınırken hata oluştu:", error);
        }
    };

    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', async() => {
            const notificationDropdown = document.getElementById('notification-dropdown');
            const notificationCounter = document.getElementById('notification-counter');
            const isHidden = notificationDropdown.style.display === 'none';
            notificationDropdown.style.display = isHidden ? 'block' : 'none';
            if (isHidden && notificationCounter.style.display !== 'none' && parseInt(notificationCounter.textContent) > 0) {
                try {
                    await fetch('/api/notifications/mark-as-read', {
                        method: 'POST'
                    });
                    notificationCounter.style.display = 'none';
                    notificationCounter.textContent = '0';
                } catch (error) {
                    console.error("Bildirimler okunmuş olarak işaretlenemedi:", error);
                }
            }
        });
        document.addEventListener('click', (event) => {
            const notificationDropdown = document.getElementById('notification-dropdown');
            if (notificationBell && !notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.style.display = 'none';
            }
        });
    }
    const initPage = () => {
        initializeCalendar();
        checkNotifications();
        setInterval(checkNotifications, 30000);
    };

    initPage();
});