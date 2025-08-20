document.addEventListener('DOMContentLoaded', async() => {
            // --- ELEMENT SEÇİMLERİ (DEĞİŞİKLİK YOK) ---
            let currentUser = null,
                personnelList = [];
            const taskInput = document.getElementById('task-input');
            const dueDateInput = document.getElementById('due-date-input');
            const assignToSelect = document.getElementById('assign-to-select');
            const prioritySelect = document.getElementById('priority-select');
            const addTaskBtn = document.getElementById('add-task-btn');
            const taskList = document.getElementById('task-list');
            const logoutBtn = document.getElementById('logout-btn');
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

            // --- YARDIMCI FONKSİYONLAR (DEĞİŞİKLİK YOK) ---
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

            // --- API FONKSİYONLARI (DEĞİŞİKLİK YOK) ---
            const loadInitialData = async() => {
                try {
                    const e = await fetch("/api/initial_data");
                    if (!e.ok) return void(window.location.href = "/");
                    const t = await e.json();
                    currentUser = t.currentUser, personnelList = t.personnel, "admin" === currentUser.role && assignToSelect && (assignToSelect.innerHTML = '<option value="">Personel Secin</option>', personnelList.forEach((e => {
                        const t = document.createElement("option");
                        t.value = e.id, t.textContent = e.username, assignToSelect.appendChild(t)
                    })))
                } catch (e) { console.error("Initial data yüklenemedi:", e), window.location.href = "/" }
            };
            const getTasks = async() => (await fetch('/api/tasks')).json();
            const addTask = async(task) => await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
            const updateTaskAPI = async(id, updates) => await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            const deleteTaskAPI = async(id) => await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            const logout = async() => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            };

            // --- ANA RENDER FONKSİYONLARI ---
            const renderTasks = async() => {
                    const tasks = await getTasks();
                    if (!taskList) return;
                    taskList.innerHTML = '';
                    tasks.forEach(task => {
                                const li = document.createElement('li');
                                li.className = 'task-item';
                                li.dataset.id = task.id;
                                if (task.completed) li.classList.add('completed');
                                if (isOverdue(task)) li.classList.add('overdue');
                                const priorityMap = { 'high': 'Yüksek', 'normal': 'Normal', 'low': 'Düşük' };
                                let taskHTML;
                                if (currentUser.role === 'admin') {
                                    taskHTML = `<div class="task-info"><i class="fa-solid ${task.completed ? 'fa-circle-check' : 'fa-circle-dot'} task-status"></i><span class="task-text">${task.text}</span><span class="assigned-user">(${task.assignedToUsername})</span></div><div class="task-details"><span class="priority-tag priority-${task.priority || 'normal'}">${priorityMap[task.priority] || 'Normal'}</span>${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate, false)}</span>` : ''}<button class="edit-btn"><i class="fa-solid fa-pencil"></i></button><button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button></div>`;
    } else {
        taskHTML = `<div class="task-info"><input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}><span class="task-text">${task.text}</span></div><div class="task-details">${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate, false)}</span>` : ''}</div>`;
    }
    li.innerHTML = taskHTML;
    taskList.appendChild(li);
});
};

const toggleEditMode = (taskItem) => { const taskId=Number(taskItem.dataset.id);getTasks().then((tasks=>{const taskToEdit=tasks.find((t=>t.id===taskId));if(!taskToEdit)return;taskItem.classList.add("editing"),taskItem.style.cursor="default";const createPersonnelOptions=selectedUserId=>personnelList.map((p=>`<option value="${p.id}" ${p.id===selectedUserId?"selected":""}>${p.username}</option>`)).join("");taskItem.innerHTML=`<div class="task-info edit-mode-info"><input type="text" class="edit-input" value="${taskToEdit.text}"><input type="date" class="edit-date" value="${taskToEdit.dueDate||""}"><select class="edit-assign-to">${createPersonnelOptions(taskToEdit.assignedTo)}</select></div><div class="edit-controls"><button class="save-btn edit-btn-action">Kaydet</button><button class="cancel-btn edit-btn-action">İptal</button></div>`,taskItem.querySelector(".save-btn").addEventListener("click",(async()=>{const updates={text:taskItem.querySelector(".edit-input").value.trim(),dueDate:taskItem.querySelector(".edit-date").value,assignedTo:parseInt(taskItem.querySelector(".edit-assign-to").value)};""!==updates.text?(await updateTaskAPI(taskId,updates),await renderTasks()):alert("Görev metni boş olamaz!")})),taskItem.querySelector(".cancel-btn").addEventListener("click",(()=>renderTasks()))}))};

// --- MODAL FONKSİYONLARI (GÜNCELLENDİ) ---
const openTaskModal = async (taskId) => {
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
    
    // YORUMLARI RENDER ETME (GÜNCELLENDİ)
    modalCommentsList.innerHTML = '';
    if (task.comments && task.comments.length > 0) {
        task.comments.forEach(c => {
            const el = document.createElement('div');
            el.className = 'comment-item';
            el.dataset.commentId = c.comment_id; // ID'yi sakla
            let controlsHTML = '';
            if (c.can_edit) { // Backend'den gelen yetkiyi kontrol et
                controlsHTML = `
                    <div class="comment-controls">
                        <button class="control-btn edit-comment-btn" title="Düzenle"><i class="fa-solid fa-pencil"></i></button>
                        <button class="control-btn delete-btn-icon delete-comment-btn" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                    </div>`;
            }
            el.innerHTML = `
                <div class="comment-content">
                    <p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p>
                    <p class="comment-text">${c.text}</p>
                </div>
                ${controlsHTML}`;
            modalCommentsList.appendChild(el);
        });
    } else { modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>'; }
    
    // DOSYALARI RENDER ETME (GÜNCELLENDİ)
    modalFilesList.innerHTML = '';
    if (task.files && task.files.length > 0) {
        task.files.forEach(f => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.innerHTML = `
                <a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a>
                <div class="file-controls">
                     <button class="control-btn delete-btn-icon delete-file-btn" data-filename="${f.stored_name}" title="Dosyayı Sil"><i class="fa-solid fa-times"></i></button>
                </div>`;
            modalFilesList.appendChild(el);
        });
    } else { modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>'; }
    
    taskModal.style.display = 'flex';
} catch (error) { console.error(error); alert('Görev detayları yüklenemedi.'); }
};
const closeTaskModal = () => { taskModal.style.display = "none"; currentTaskId = null; modalCommentInput.value = ""; modalFileInput.value = ""; };
const handleAddComment = async () => { const text = modalCommentInput.value.trim(); if (!text || !currentTaskId) return; try { await fetch(`/api/tasks/${currentTaskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }); await openTaskModal(currentTaskId); modalCommentInput.value = ""; } catch (error) { alert('Yorum eklenirken bir hata oluştu.'); } };
const handleFileUpload = async () => { const file = modalFileInput.files[0]; if (!file || !currentTaskId) return alert('Lütfen bir dosya seçin.'); const formData = new FormData(); formData.append('file', file); try { await fetch(`/api/tasks/${currentTaskId}/upload`, { method: 'POST', body: formData }); await openTaskModal(currentTaskId); modalFileInput.value = ""; } catch (error) { alert('Dosya yüklenirken bir hata oluştu.'); } };

// --- BAŞLANGIÇ VE OLAY DİNLEYİCİLER ---
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (addTaskBtn) { addTaskBtn.addEventListener('click', async () => { const task = { text: taskInput.value.trim(), dueDate: dueDateInput.value, assignedTo: parseInt(assignToSelect.value), priority: prioritySelect.value }; if (task.text === '' || !task.assignedTo) return alert('Lütfen görev metnini ve personeli seçin.'); await addTask(task); await renderTasks(); taskInput.value = ''; dueDateInput.value = ''; assignToSelect.value = ''; }); }

// =================================================================================
// GÜNCELLENEN BÖLÜM BURASI
// =================================================================================
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
            // Eğer özel bir butona tıklanmadıysa, modal'ı aç
            openTaskModal(taskId);
        }
    });
}
// =================================================================================
// GÜNCELLEME SONA ERDİ
// =================================================================================
    
// MODAL İÇİN OLAY DİNLEYİCİLER (GÜNCELLENDİ)
if (taskModal) {
    modalCloseBtn.addEventListener('click', closeTaskModal);
    taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
    modalAddCommentBtn.addEventListener('click', handleAddComment);
    modalUploadBtn.addEventListener('click', handleFileUpload);
    
    // YORUM VE DOSYA SİLME/DÜZENLEME İÇİN YENİ OLAY YAKALAMA
    modalCommentsList.addEventListener('click', async (e) => {
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
            const editHTML = `<div class="comment-edit-view"><input type="text" class="comment-edit-input" value="${originalText}"><div class="comment-edit-actions"><button class="comment-save-btn">Kaydet</button><button class="comment-cancel-btn">İptal</button></div></div>`;
            commentItem.insertAdjacentHTML('beforeend', editHTML);
        }
        if (deleteBtn) {
            if (confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
                await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'DELETE' });
                await openTaskModal(currentTaskId);
            }
        }
    });
    modalCommentsList.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.comment-save-btn');
        const cancelBtn = e.target.closest('.comment-cancel-btn');
        if (!saveBtn && !cancelBtn) return;
        
        const commentItem = e.target.closest('.comment-item');
        const commentId = commentItem.dataset.commentId;
        const contentDiv = commentItem.querySelector('.comment-content');
        const editView = commentItem.querySelector('.comment-edit-view');

        if (cancelBtn) {
            editView.remove();
            contentDiv.style.display = 'block';
        }
        if (saveBtn) {
            const newText = commentItem.querySelector('.comment-edit-input').value.trim();
            if (newText) {
                await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText }) });
                await openTaskModal(currentTaskId); // Re-render to show updated comment
            }
        }
    });
    modalFilesList.addEventListener('click', async (e) => {
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
const checkNotifications = async () => {
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
    notificationBell.addEventListener('click', async () => {
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
await loadInitialData();
await renderTasks();
});