document.addEventListener('DOMContentLoaded', async() => {
            // Mevcut Elementler
            let currentUser = null,
                personnelList = [];
            const taskInput = document.getElementById('task-input');
            const dueDateInput = document.getElementById('due-date-input');
            const assignToSelect = document.getElementById('assign-to-select');
            const prioritySelect = document.getElementById('priority-select');
            const addTaskBtn = document.getElementById('add-task-btn');
            const taskList = document.getElementById('task-list');
            const logoutBtn = document.getElementById('logout-btn');

            // --- YENİ EKLENEN MODAL ELEMENTLERİ ---
            const taskModal = document.getElementById('task-modal');
            const modalCloseBtn = document.getElementById('modal-close-btn');
            const modalTaskTitle = document.getElementById('modal-task-title');
            const modalAssignedUser = document.getElementById('modal-assigned-user');
            const modalDueDate = document.getElementById('modal-due-date');
            const modalTaskDescription = document.getElementById('modal-task-description');
            const modalCommentsList = document.getElementById('modal-comments-list');
            const modalCommentInput = document.getElementById('modal-comment-input');
            const modalAddCommentBtn = document.getElementById('modal-add-comment-btn');
            const modalFilesList = document.getElementById('modal-files-list');
            const modalFileInput = document.getElementById('modal-file-input');
            const modalUploadBtn = document.getElementById('modal-upload-btn');

            let currentTaskId = null; // Hangi görevin modal'da açık olduğunu tutmak için
            // ------------------------------------------

            const loadInitialData = async() => {
                try {
                    const response = await fetch('/api/initial_data');
                    if (!response.ok) { window.location.href = '/'; return; }
                    const data = await response.json();
                    currentUser = data.currentUser;
                    personnelList = data.personnel;
                    if (currentUser.role === 'admin' && assignToSelect) {
                        assignToSelect.innerHTML = '<option value="">Personel Secin</option>';
                        personnelList.forEach(p => {
                            const option = document.createElement('option');
                            option.value = p.id;
                            option.textContent = p.username;
                            assignToSelect.appendChild(option);
                        });
                    }
                } catch (error) {
                    console.error('Initial data yüklenemedi:', error);
                    window.location.href = '/';
                }
            };

            const getTasks = async() => (await fetch('/api/tasks')).json();
            const addTask = async(task) => await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
            const updateTaskAPI = async(id, updates) => await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            const deleteTaskAPI = async(id) => await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            const logout = async() => { await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/'; };

            const renderTasks = async() => {
                    const tasks = await getTasks();
                    if (!taskList) return; // Eğer taskList yoksa (örn. personel yönetimi sayfasında) hata vermesin
                    taskList.innerHTML = '';
                    tasks.forEach(task => {
                                const li = document.createElement('li');
                                li.className = 'task-item';
                                li.dataset.id = task.id;
                                if (task.completed) li.classList.add('completed');
                                const priorityMap = { 'high': 'Yüksek', 'normal': 'Normal', 'low': 'Düşük' };
                                let taskHTML;
                                if (currentUser.role === 'admin') {
                                    taskHTML = `
                    <div class="task-info">
                        <i class="fa-solid ${task.completed ? 'fa-circle-check' : 'fa-circle-dot'} task-status"></i>
                        <span class="task-text">${task.text}</span>
                        <span class="assigned-user">(${task.assignedToUsername})</span>
                    </div>
                    <div class="task-details">
                        <span class="priority-tag priority-${task.priority || 'normal'}">${priorityMap[task.priority] || 'Normal'}</span>
                        ${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate)}</span>` : ''}
                        <button class="edit-btn"><i class="fa-solid fa-pencil"></i></button>
                        <button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
                    </div>`;
            } else {
                taskHTML = `
                    <div class="task-info">
                        <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                        <span class="task-text">${task.text}</span>
                    </div>
                    <div class="task-details">
                        ${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate)}</span>` : ''}
                    </div>`;
            }
            li.innerHTML = taskHTML;
            taskList.appendChild(li);
        });
    };

    const toggleEditMode = (taskItem) => {
        const taskId = Number(taskItem.dataset.id);
        getTasks().then(tasks => {
            const taskToEdit = tasks.find(t => t.id === taskId);
            if (!taskToEdit) return;
            taskItem.classList.add('editing');
            taskItem.style.cursor = 'default'; // Düzenleme modunda tıklamayı engelle
            const createPersonnelOptions = (selectedUserId) => personnelList.map(p => `<option value="${p.id}" ${p.id === selectedUserId ? 'selected' : ''}>${p.username}</option>`).join('');
            taskItem.innerHTML = `
                <div class="task-info edit-mode-info">
                    <input type="text" class="edit-input" value="${taskToEdit.text}">
                    <input type="date" class="edit-date" value="${taskToEdit.dueDate || ''}">
                    <select class="edit-assign-to">${createPersonnelOptions(taskToEdit.assignedTo)}</select>
                </div>
                <div class="edit-controls">
                    <button class="save-btn edit-btn-action">Kaydet</button>
                    <button class="cancel-btn edit-btn-action">İptal</button>
                </div>`;
            taskItem.querySelector('.save-btn').addEventListener('click', async () => {
                const updates = { text: taskItem.querySelector('.edit-input').value.trim(), dueDate: taskItem.querySelector('.edit-date').value, assignedTo: parseInt(taskItem.querySelector('.edit-assign-to').value) };
                if (updates.text === '') return alert('Görev metni boş olamaz!');
                await updateTaskAPI(taskId, updates);
                await renderTasks();
            });
            taskItem.querySelector('.cancel-btn').addEventListener('click', () => renderTasks());
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // --- YENİ EKLENEN MODAL FONKSİYONLARI ---

    const openTaskModal = async (taskId) => {
        currentTaskId = taskId;
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            if (!response.ok) throw new Error('Görev detayları alınamadı.');
            const task = await response.json();

            modalTaskTitle.textContent = task.text;
            modalAssignedUser.textContent = task.assignedToUsername || 'Bilinmiyor';
            modalDueDate.textContent = task.dueDate ? formatDate(task.dueDate) : 'Belirtilmemiş';
            modalTaskDescription.textContent = task.description || 'Bu görev için henüz bir açıklama girilmemiş.';

            modalCommentsList.innerHTML = '';
            if (task.comments && task.comments.length > 0) {
                task.comments.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    const commentDate = new Date(comment.timestamp).toLocaleString('tr-TR');
                    commentEl.innerHTML = `
                        <p class="comment-author">${comment.author_username} <span class="comment-date">- ${commentDate}</span></p>
                        <p>${comment.text}</p>`;
                    modalCommentsList.appendChild(commentEl);
                });
            } else {
                modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>';
            }

            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(file => {
                    const fileEl = document.createElement('div');
                    fileEl.className = 'file-item';
                    fileEl.innerHTML = `<a href="/uploads/${file.stored_name}" target="_blank">${file.original_name}</a>`;
                    modalFilesList.appendChild(fileEl);
                });
            } else {
                modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>';
            }
            
            taskModal.style.display = 'flex';
        } catch (error) {
            console.error('Modal açılırken hata:', error);
            alert('Görev detayları yüklenemedi.');
        }
    };

    const closeTaskModal = () => {
        taskModal.style.display = 'none';
        currentTaskId = null;
        modalCommentInput.value = '';
        modalFileInput.value = '';
    };

    const handleAddComment = async () => {
        const commentText = modalCommentInput.value.trim();
        if (!commentText || !currentTaskId) return;
        try {
            const response = await fetch(`/api/tasks/${currentTaskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentText }),
            });
            if (!response.ok) throw new Error('Yorum eklenemedi.');
            await openTaskModal(currentTaskId);
            modalCommentInput.value = '';
        } catch (error) {
            console.error('Yorum eklenirken hata:', error);
            alert('Yorum eklenirken bir hata oluştu.');
        }
    };

    const handleFileUpload = async () => {
        const file = modalFileInput.files[0];
        if (!file || !currentTaskId) return alert('Lütfen bir dosya seçin.');
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            await fetch(`/api/tasks/${currentTaskId}/upload`, { method: 'POST', body: formData });
            await openTaskModal(currentTaskId);
            modalFileInput.value = '';
        } catch (error) {
            console.error('Dosya yüklenirken hata:', error);
            alert('Dosya yüklenirken bir hata oluştu.');
        }
    };

    // --- MEVCUT OLAY DİNLEYİCİLERİ ---

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', async () => {
            const task = { text: taskInput.value.trim(), dueDate: dueDateInput.value, assignedTo: parseInt(assignToSelect.value), priority: prioritySelect.value };
            if (task.text === '' || !task.assignedTo) return alert('Lütfen görev metnini ve personeli seçin.');
            await addTask(task);
            await renderTasks();
            taskInput.value = ''; dueDateInput.value = ''; assignToSelect.value = '';
        });
    }

    if (taskList) {
        taskList.addEventListener('click', async (event) => {
            const taskItem = event.target.closest('.task-item');
            if (!taskItem || taskItem.classList.contains('editing')) return;
            const taskId = Number(taskItem.dataset.id);
            
            if (event.target.closest('.delete-btn')) {
                if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                    await deleteTaskAPI(taskId);
                    await renderTasks();
                }
            } else if (event.target.closest('.edit-btn')) {
                toggleEditMode(taskItem);
            } else if (event.target.matches('.task-checkbox')) {
                await updateTaskAPI(taskId, { completed: event.target.checked });
                setTimeout(renderTasks, 100);
            } else {
                // EĞER BUTONLARA TIKLANMADIYSA MODAL'I AÇ
                openTaskModal(taskId);
            }
        });
    }

    // --- YENİ EKLENEN MODAL OLAY DİNLEYİCİLERİ ---
    if (taskModal) {
        modalCloseBtn.addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
        modalAddCommentBtn.addEventListener('click', handleAddComment);
        modalUploadBtn.addEventListener('click', handleFileUpload);
    }

    await loadInitialData();
    await renderTasks();
});