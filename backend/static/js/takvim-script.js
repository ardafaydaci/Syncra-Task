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

                if (eventId && !String(eventId).startsWith('birthday-')) {
                    openTaskModal(eventId);
                }
            }
        });

        calendar.render();
    };

    // Sayfa yüklendiğinde takvimi başlat
    initializeCalendar();
});