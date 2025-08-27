document.addEventListener('DOMContentLoaded', async() => {
    // --- Element Seçimleri ---
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
    const logoutBtn = document.getElementById('logout-btn');
    let currentTaskId = null;

    // --- YARDIMCI VE API FONKSİYONLARI ---
    const getTasks = async() => (await fetch('/api/tasks')).json();
    const isOverdue = (task) => {
        if (task.completed || !task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(task.dueDate) < today;
    };
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

    // GÜNCELLEME: Konfeti tetikleyicisi eklendi
    const updateTaskStatus = async(taskId, newStatus) => {
        const isCompleted = newStatus === 'done';

        if (isCompleted && typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 90,
                origin: {
                    y: 0.7
                },
                zIndex: 2000
            });
        }

        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus,
                completed: isCompleted
            })
        });
    };

    // --- ANA İŞLEVSELLİK (Değişiklik yok) ---
    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.classList.add('task-card');
        if (isOverdue(task)) card.classList.add('overdue');
        if (task.is_blocked) {
            card.classList.add('blocked');
        } else {
            card.setAttribute('draggable', 'true');
        }
        card.dataset.id = task.id;
        let priorityText = 'Normal';
        if (task.priority === 'high') priorityText = 'Yüksek';
        if (task.priority === 'low') priorityText = 'Düşük';
        const lockIcon = task.is_blocked ? '<i class="fa-solid fa-lock blocked-icon" title="Bu görev başka bir görevin tamamlanmasını bekliyor"></i>' : '';
        card.innerHTML = `<p class="task-card-text">${task.text}${lockIcon}</p><div class="task-card-footer"><span class="priority-tag priority-${task.priority || 'normal'}">${priorityText}</span></div>`;
        return card;
    };

    const renderBoard = async() => {
        const tasks = await getTasks();
        document.getElementById("todo-tasks").innerHTML = "";
        document.getElementById("inprogress-tasks").innerHTML = "";
        document.getElementById("done-tasks").innerHTML = "";
        tasks.forEach((task => {
            const card = createTaskCard(task);
            const columnId = `${task.status || "todo"}-tasks`;
            const column = document.getElementById(columnId);
            if (column) column.appendChild(card);
        }));
        addDragAndDropListeners();
    };

    const addDragAndDropListeners = () => {
        const taskCards = document.querySelectorAll(".task-card:not(.blocked)");
        const columns = document.querySelectorAll(".kanban-column .tasks-container");
        let draggedCard = null;
        taskCards.forEach((card => {
            card.addEventListener("dragstart", (() => {
                draggedCard = card;
                setTimeout((() => card.classList.add("dragging")), 0);
            }));
            card.addEventListener("dragend", (() => {
                card.classList.remove("dragging");
                draggedCard = null;
            }));
        }));
        columns.forEach((column => {
            column.addEventListener("dragover", (e => e.preventDefault()));
            column.addEventListener("drop", (async e => {
                e.preventDefault();
                if (draggedCard) {
                    const previousColumn = draggedCard.closest('.kanban-column');
                    const previousStatus = previousColumn ? previousColumn.dataset.status : null;
                    const newStatus = column.parentElement.dataset.status;

                    if (previousStatus !== newStatus) {
                        column.appendChild(draggedCard);
                        await updateTaskStatus(draggedCard.dataset.id, newStatus);
                    }
                }
            }));
        }));
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.task-card.dragging')) return;
                openTaskModal(card.dataset.id);
            });
        });
    };

    // ... Dosyanın geri kalanı (modal fonksiyonları vb.) aynı kalacak ...
    const openTaskModal = async(taskId) => {
        currentTaskId = taskId;
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            if (!response.ok) throw new Error('Görev detayları alınamadı.');
            const task = await response.json();
            modalTaskTitle.textContent = "Görev Detayları";
            modalTaskTextBody.textContent = task.text;
            modalAssignedUser.textContent = (task.assignedToUsernames || ['Bilinmiyor']).join(', ');
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
                    if (c.can_edit) {
                        controlsHTML = `<div class="comment-controls"><button class="control-btn edit-comment-btn" title="Düzenle"><i class="fa-solid fa-pencil"></i></button><button class="control-btn delete-btn-icon delete-comment-btn" title="Sil"><i class="fa-solid fa-trash-can"></i></button></div>`;
                    }
                    el.innerHTML = `<div class="comment-content"><p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p><p class="comment-text">${c.text}</p></div>${controlsHTML}`;
                    modalCommentsList.appendChild(el);
                });
            } else {
                modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>';
            }
            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(f => {
                    const el = document.createElement('div');
                    el.className = 'file-item';
                    el.innerHTML = `<a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a><div class="file-controls"><button class="control-btn delete-btn-icon delete-file-btn" data-filename="${f.stored_name}" title="Dosyayı Sil"><i class="fa-solid fa-times"></i></button></div>`;
                    modalFilesList.appendChild(el);
                });
            } else {
                modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>';
            }
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
        if (modalFileInput) modalFileInput.value = "";
    };
    const handleAddComment = async() => {
        const text = modalCommentInput.value.trim();
        if (!text || !currentTaskId) return;
        try {
            await fetch(`/api/tasks/${currentTaskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            await openTaskModal(currentTaskId);
            modalCommentInput.value = "";
        } catch (error) {
            alert('Yorum eklenirken bir hata oluştu.');
        }
    };
    const handleFileUpload = async() => {
        const file = modalFileInput.files[0];
        if (!file || !currentTaskId) return alert('Lütfen bir dosya seçin.');
        const formData = new FormData();
        formData.append('file', file);
        try {
            await fetch(`/api/tasks/${currentTaskId}/upload`, {
                method: 'POST',
                body: formData
            });
            await openTaskModal(currentTaskId);
            modalFileInput.value = "";
        } catch (error) {
            alert('Dosya yüklenirken bir hata oluştu.');
        }
    };

    if (taskModal) {
        modalCloseBtn.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
        modalAddCommentBtn.addEventListener('click', handleAddComment);
        modalUploadBtn.addEventListener('click', handleFileUpload);
        modalCommentsList.addEventListener('click', async(e) => {
            const editBtn = e.target.closest('.edit-comment-btn');
            const deleteBtn = e.target.closest('.delete-comment-btn');
            const saveBtn = e.target.closest('.comment-save-btn');
            const cancelBtn = e.target.closest('.comment-cancel-btn');
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
            if (cancelBtn) {
                commentItem.querySelector('.comment-edit-view').remove();
                commentItem.querySelector('.comment-content').style.display = 'block';
            }
            if (saveBtn) {
                const newText = commentItem.querySelector('.comment-edit-input').value.trim();
                if (newText) {
                    await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newText })
                    });
                    await openTaskModal(currentTaskId);
                }
            }
        });
        modalFilesList.addEventListener('click', async(e) => {
            const deleteBtn = e.target.closest('.delete-file-btn');
            if (deleteBtn) {
                const storedFilename = deleteBtn.dataset.filename;
                const originalFilename = deleteBtn.closest('.file-item').querySelector('a').textContent;
                if (confirm(`'${originalFilename}' dosyasını silmek istediğinizden emin misiniz?`)) {
                    await fetch(`/api/tasks/${currentTaskId}/files/${storedFilename}`, { method: 'DELETE' });
                    await openTaskModal(currentTaskId);
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    await renderBoard();
});