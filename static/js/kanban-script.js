document.addEventListener('DOMContentLoaded', async() => {
    // --- ELEMENT SEÇİMLERİ (DEĞİŞİKLİK YOK) ---
    const taskModal = document.getElementById('task-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskTextBody = document.getElementById('modal-task-text-body');
    const modalAssignedUser = document.getElementById('modal-assigned-user');
    const modalCreationDate = document.getElementById('modal-creation-date');
    const modalDueDate = document.getElementById('modal-due-date');
    const modalTaskDescription = document.getElementById('modal-task-description');
    const modalCommentsList = document.getElementById('modal-comments-list');
    const modalCommentInput = document.getElementById('modal-comment-input');
    const modalAddCommentBtn = document.getElementById('modal-add-comment-btn');
    const modalFilesList = document.getElementById('modal-files-list');
    const modalFileInput = document.getElementById('modal-file-input');
    const modalUploadBtn = document.getElementById('modal-upload-btn');
    let currentTaskId = null;

    // --- YARDIMCI VE API FONKSİYONLARI (DEĞİŞİKLİK YOK) ---
    const isOverdue = (task) => {
        if (task.completed || !task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(task.dueDate) < today;
    };
    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'Belirtilmemiş';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleString('tr-TR', options);
    };
    const getTasks = async() => (await fetch('/api/tasks')).json();
    const updateTaskStatus = async(taskId, newStatus) => {
        const isCompleted = newStatus === 'done';
        await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, completed: isCompleted }) });
    };

    // --- ANA RENDER FONKSİYONLARI (GÜNCELLENDİ) ---
    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.classList.add('task-card');
        if (isOverdue(task)) card.classList.add('overdue');
        card.setAttribute('draggable', 'true');
        card.dataset.id = task.id;
        let priorityText = 'Normal';
        if (task.priority === 'high') priorityText = 'Yüksek';
        if (task.priority === 'low') priorityText = 'Düşük';
        card.innerHTML = `<p class="task-card-text">${task.text}</p><div class="task-card-footer"><span class="assigned-user-badge">${task.assignedToUsername.charAt(0)}</span><span class="priority-tag priority-${task.priority || 'normal'}">${priorityText}</span></div>`;
        return card;
    };
    const renderBoard = async() => {
        const tasks = await getTasks();
        document.getElementById("todo-tasks").innerHTML = "", document.getElementById("inprogress-tasks").innerHTML = "", document.getElementById("done-tasks").innerHTML = "", tasks.forEach((task => {
            const card = createTaskCard(task),
                columnId = `${task.status||"todo"}-tasks`,
                column = document.getElementById(columnId);
            column && column.appendChild(card)
        })), addDragAndDropListeners()
    };
    const addDragAndDropListeners = () => {
        const taskCards = document.querySelectorAll(".task-card"),
            columns = document.querySelectorAll(".kanban-column .tasks-container");
        let draggedCard = null;
        taskCards.forEach((card => { card.addEventListener("dragstart", (() => { draggedCard = card, setTimeout((() => card.classList.add("dragging")), 0) })), card.addEventListener("dragend", (() => { card.classList.remove("dragging"), draggedCard = null })), card.addEventListener("click", (() => openTaskModal(card.dataset.id))) })), columns.forEach((column => { column.addEventListener("dragover", (e => e.preventDefault())), column.addEventListener("drop", (async e => { e.preventDefault(), draggedCard && (column.appendChild(draggedCard), await updateTaskStatus(draggedCard.dataset.id, column.parentElement.dataset.status)) })) }))
    };

    // --- MODAL FONKSİYONLARI (gorev-script.js'ten kopyalandı) ---
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
                    el.dataset.commentId = c.comment_id;
                    let controlsHTML = '';
                    if (c.can_edit) { controlsHTML = `<div class="comment-controls"><button class="control-btn edit-comment-btn" title="Düzenle"><i class="fa-solid fa-pencil"></i></button><button class="control-btn delete-btn-icon delete-comment-btn" title="Sil"><i class="fa-solid fa-trash-can"></i></button></div>`; }
                    el.innerHTML = `<div class="comment-content"><p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p><p class="comment-text">${c.text}</p></div>${controlsHTML}`;
                    modalCommentsList.appendChild(el);
                });
            } else { modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>'; }
            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(f => {
                    const el = document.createElement('div');
                    el.className = 'file-item';
                    el.innerHTML = `<a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a><div class="file-controls"><button class="control-btn delete-btn-icon delete-file-btn" data-filename="${f.stored_name}" title="Dosyayı Sil"><i class="fa-solid fa-times"></i></button></div>`;
                    modalFilesList.appendChild(el);
                });
            } else { modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>'; }
            taskModal.style.display = 'flex';
        } catch (error) {
            console.error(error);
            alert('Görev detayları yüklenemedi.');
        }
    };
    const closeTaskModal = () => {
        taskModal.style.display = "none";
        currentTaskId = null;
        modalCommentInput.value = "";
        modalFileInput.value = "";
    };
    const handleAddComment = async() => {
        const text = modalCommentInput.value.trim();
        if (!text || !currentTaskId) return;
        try {
            await fetch(`/api/tasks/${currentTaskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
            await openTaskModal(currentTaskId);
            modalCommentInput.value = "";
        } catch (error) { alert('Yorum eklenirken bir hata oluştu.'); }
    };
    const handleFileUpload = async() => {
        const file = modalFileInput.files[0];
        if (!file || !currentTaskId) return alert('Lütfen bir dosya seçin.');
        const formData = new FormData();
        formData.append('file', file);
        try {
            await fetch(`/api/tasks/${currentTaskId}/upload`, { method: 'POST', body: formData });
            await openTaskModal(currentTaskId);
            modalFileInput.value = "";
        } catch (error) { alert('Dosya yüklenirken bir hata oluştu.'); }
    };

    // --- OLAY DİNLEYİCİLER (gorev-script.js'ten kopyalandı) ---
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn && logoutBtn.addEventListener("click", async() => { await fetch("/api/logout", { method: "POST" }), window.location.href = "/" });
    if (taskModal) {
        modalCloseBtn.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
        modalAddCommentBtn.addEventListener('click', handleAddComment);
        modalUploadBtn.addEventListener('click', handleFileUpload);
        modalCommentsList.addEventListener('click', async(e) => {
            const editBtn = e.target.closest('.edit-comment-btn');
            const deleteBtn = e.target.closest('.delete-comment-btn');
            const commentItem = e.target.closest('.comment-item');
            if (!commentItem) return;
            const commentId = commentItem.dataset.commentId;
            if (editBtn) {
                const contentDiv = commentItem.querySelector('.comment-content');
                const textP = commentItem.querySelector('.comment-text');
                const originalText = textP.textContent;
                contentDiv.style.display = 'none';
                commentItem.insertAdjacentHTML('beforeend', `<div class="comment-edit-view"><input type="text" class="comment-edit-input" value="${originalText}"><div class="comment-edit-actions"><button class="comment-save-btn">Kaydet</button><button class="comment-cancel-btn">İptal</button></div></div>`);
            }
            if (deleteBtn) {
                if (confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
                    await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'DELETE' });
                    await openTaskModal(currentTaskId);
                }
            }
        });
        modalCommentsList.addEventListener('click', async(e) => {
            const saveBtn = e.target.closest('.comment-save-btn');
            const cancelBtn = e.target.closest('.comment-cancel-btn');
            if (!saveBtn && !cancelBtn) return;
            const commentItem = e.target.closest('.comment-item');
            const commentId = commentItem.dataset.commentId;
            if (cancelBtn) {
                commentItem.querySelector('.comment-edit-view').remove();
                commentItem.querySelector('.comment-content').style.display = 'block';
            }
            if (saveBtn) {
                const newText = commentItem.querySelector('.comment-edit-input').value.trim();
                if (newText) {
                    await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText }) });
                    await openTaskModal(currentTaskId);
                }
            }
        });
        modalFilesList.addEventListener('click', async(e) => {
            const deleteBtn = e.target.closest('.delete-file-btn');
            if (deleteBtn) {
                const storedFilename = deleteBtn.dataset.filename;
                if (confirm(`'${storedFilename.split('_').slice(1).join('_')}' dosyasını silmek istediğinizden emin misiniz?`)) {
                    await fetch(`/api/tasks/${currentTaskId}/files/${storedFilename}`, { method: 'DELETE' });
                    await openTaskModal(currentTaskId);
                }
            }
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

    // Sayfa yüklendiğinde ve ardından her 30 saniyede bir bildirimleri kontrol et
    checkNotifications();
    setInterval(checkNotifications, 30000);

    // =========================================================================
    // === BİLDİRİM SİSTEMİ KODU SONU ===
    // =========================================================================
    await renderBoard();
});