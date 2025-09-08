document.addEventListener('DOMContentLoaded', async() => {
            let currentUser = null;
            let personnelList = [];
            // --- Element Seçimleri ---
            const taskInput = document.getElementById('task-input');
            const descriptionInput = document.getElementById('task-description-input');
            const dueDateInput = document.getElementById('due-date-input');
            const prioritySelect = document.getElementById('priority-select');
            const addTaskBtn = document.getElementById('add-task-btn');
            const taskList = document.getElementById('task-list');
            const logoutBtn = document.getElementById('logout-btn');

            const assignToContainer = document.getElementById('assign-to-select-container');
            const assignToButtonText = assignToContainer ? assignToContainer.querySelector('.select-button-text') : null;
            const assignToOptions = assignToContainer ? assignToContainer.querySelector('.custom-select-options') : null;

            const dependenciesContainer = document.getElementById('dependencies-select-container');
            const dependenciesButtonText = dependenciesContainer ? dependenciesContainer.querySelector('.select-button-text') : null;
            const dependenciesOptions = dependenciesContainer ? dependenciesContainer.querySelector('.custom-select-options') : null;

            const taskModal = document.getElementById('task-modal');
            const modalCloseBtn = document.getElementById('modal-close-btn');
            const modalTaskTitle = document.getElementById('modal-task-title');
            const modalTaskTextBody = document.getElementById('modal-task-text-body');
            const modalAssignedUser = document.getElementById('modal-assigned-user');
            const modalCreationDate = document.getElementById('modal-creation-date');
            const modalDueDate = document.getElementById('modal-due-date');
            const modalActivityLog = document.getElementById('modal-activity-log');
            const editDescriptionBtn = document.getElementById('edit-description-btn');
            const descriptionView = document.getElementById('description-view');
            const modalTaskDescription = document.getElementById('modal-task-description');
            const descriptionEditView = document.getElementById('description-edit-view');
            const descriptionEditInput = document.getElementById('modal-description-edit-input');
            const saveDescriptionBtn = document.getElementById('save-description-btn');
            const cancelDescriptionBtn = document.getElementById('cancel-description-btn');
            const modalCommentsList = document.getElementById('modal-comments-list');
            const modalCommentInput = document.getElementById('modal-comment-input');
            const modalAddCommentBtn = document.getElementById('modal-add-comment-btn');
            const modalFilesList = document.getElementById('modal-files-list');
            const modalFileInput = document.getElementById('modal-file-input');
            const modalUploadBtn = document.getElementById('modal-upload-btn');
            let currentTaskId = null;

            // --- YARDIMCI VE API FONKSİYONLARI ---
            const getTasks = async() => (await fetch('/api/tasks')).json();
            const addTask = async(task) => await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
            const updateTaskAPI = async(id, updates) => await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            const deleteTaskAPI = async(id) => await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            const logout = async() => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            };
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

            // --- ÖZEL DROPDOWN FONKSİYONLARI ---
            const updateCustomSelectButtonText = (buttonTextElement, optionsElement, defaultText, selectedText) => {
                if (!optionsElement || !buttonTextElement) return;
                const selectedCheckboxes = optionsElement.querySelectorAll('input[type="checkbox"]:checked');
                if (selectedCheckboxes.length === 0) { buttonTextElement.textContent = defaultText; } else if (selectedCheckboxes.length === 1) { buttonTextElement.textContent = selectedCheckboxes[0].parentElement.querySelector('label').textContent; } else { buttonTextElement.textContent = `${selectedCheckboxes.length} ${selectedText} seçildi`; }
            };
            const populateDependenciesDropdown = async() => {
                if (!dependenciesOptions) return;
                const allTasks = await getTasks();
                dependenciesOptions.innerHTML = '';
                allTasks.forEach(task => {
                    const li = document.createElement('li');
                    li.dataset.value = task.id;
                    li.innerHTML = `<input type="checkbox" id="dep-${task.id}"><label for="dep-${task.id}">${task.text}</label>`;
                    dependenciesOptions.appendChild(li);
                });
            };
            const setupCustomSelect = (container) => {
                if (!container) return;
                const button = container.querySelector('.custom-select-button');
                const options = container.querySelector('.custom-select-options');
                const buttonText = container.querySelector('.select-button-text');
                const defaultText = buttonText.textContent;
                const selectedText = container.id.includes('assign') || container.id.includes('personnel') ? 'personel' : 'bağımlılık';
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = options.style.display === 'none';
                    document.querySelectorAll('.custom-select-options').forEach(opt => { if (opt !== options) opt.style.display = 'none'; });
                    document.querySelectorAll('.custom-select-container').forEach(cont => { if (cont !== container) cont.classList.remove('open'); });
                    options.style.display = isHidden ? 'block' : 'none';
                    container.classList.toggle('open', isHidden);
                });
                options.addEventListener('change', () => {
                    updateCustomSelectButtonText(buttonText, options, defaultText, selectedText);
                });
            };

            // --- ANA İŞLEVSELLİK ---
            const loadInitialData = async() => {
                try {
                    const response = await fetch("/api/initial_data");
                    if (!response.ok) return void(window.location.href = "/");
                    const data = await response.json();
                    currentUser = data.currentUser;
                    personnelList = data.personnel;
                    if (currentUser.role === "admin" && assignToOptions) {
                        assignToOptions.innerHTML = '';
                        personnelList.forEach(person => {
                            const li = document.createElement('li');
                            li.dataset.value = person.id;
                            li.innerHTML = `<input type="checkbox" id="user-${person.id}"><label for="user-${person.id}">${person.username}</label>`;
                            assignToOptions.appendChild(li);
                        });
                    }
                } catch (error) {
                    console.error("Initial data yüklenemedi:", error);
                    window.location.href = "/";
                }
            };

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
                                if (task.is_blocked) li.classList.add('blocked');
                                const priorityMap = { 'high': 'Yüksek', 'normal': 'Normal', 'low': 'Düşük' };
                                const disabledAttr = task.is_blocked ? 'disabled' : '';
                                const lockIcon = task.is_blocked ? `<i class="fa-solid fa-lock blocked-icon" title="Bu görev başka bir görevin tamamlanmasını bekliyor"></i>` : '';
                                const assigneesHTML = (task.assignedToUsernames || []).map(username => `<span class="assigned-user-badge-sm" title="${username}">${username.charAt(0)}</span>`).join('');
                                let taskHTML;
                                if (currentUser.role === 'admin') {
                                    taskHTML = `<div class="task-info"><i class="fa-solid ${task.completed ? 'fa-circle-check' : 'fa-circle-dot'} task-status"></i><span class="task-text">${task.text}${lockIcon}</span><div class="assignees-container">${assigneesHTML}</div></div><div class="task-details"><span class="priority-tag priority-${task.priority || 'normal'}">${priorityMap[task.priority] || 'Normal'}</span>${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate, false)}</span>` : ''}<button class="edit-btn" ${disabledAttr}><i class="fa-solid fa-pencil"></i></button><button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button></div>`;
            } else {
                taskHTML = `<div class="task-info"><input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''} ${disabledAttr}><span class="task-text">${task.text}${lockIcon}</span></div><div class="task-details">${task.dueDate ? `<span class="due-date">Son Tarih: ${formatDate(task.dueDate, false)}</span>` : ''}</div>`;
            }
            li.innerHTML = taskHTML; taskList.appendChild(li);
        });
    };

    const toggleEditMode = async (taskItem) => {
        const taskId = Number(taskItem.dataset.id);
        const allTasks = await getTasks();
        const taskToEdit = allTasks.find(t => t.id === taskId);
        if (!taskToEdit) return;
        taskItem.classList.add("editing");
        taskItem.style.cursor = "default";
        let personnelListItems = '';
        personnelList.forEach(person => {
            const isChecked = (taskToEdit.assignedTo || []).includes(person.id) ? 'checked' : '';
            personnelListItems += `<li data-value="${person.id}"><input type="checkbox" id="edit-user-${person.id}" ${isChecked}><label for="edit-user-${person.id}">${person.username}</label></li>`;
        });
        const personnelDropdownHTML = `<div id="edit-personnel-container" class="custom-select-container"><button type="button" class="custom-select-button"><span class="select-button-text">Personel Seçin</span><i class="fa-solid fa-chevron-down select-arrow"></i></button><ul class="custom-select-options" style="display: none;">${personnelListItems}</ul></div>`;
        let dependencyListItems = '';
        allTasks.forEach(task => {
            if (task.id !== taskId) {
                const isChecked = (taskToEdit.depends_on || []).includes(task.id) ? 'checked' : '';
                dependencyListItems += `<li data-value="${task.id}"><input type="checkbox" id="edit-dep-${task.id}" ${isChecked}><label for="edit-dep-${task.id}">${task.text}</label></li>`;
            }
        });
        const dependenciesDropdownHTML = `<div id="edit-dependencies-container" class="custom-select-container"><button type="button" class="custom-select-button"><span class="select-button-text">Bağımlılık Seçin</span><i class="fa-solid fa-chevron-down select-arrow"></i></button><ul class="custom-select-options" style="display: none;">${dependencyListItems}</ul></div>`;
        taskItem.innerHTML = `<div class="task-info edit-mode-info" style="flex-wrap: wrap; gap: 10px;"><input type="text" class="edit-input" value="${taskToEdit.text}" style="flex-grow: 1;"><input type="date" class="edit-date" value="${taskToEdit.dueDate || ""}"><div style="flex-basis: 100%; min-width: 200px;">${personnelDropdownHTML}</div><div style="width: 100%; margin-top: 10px;"><label>Bağımlılıklar:</label>${dependenciesDropdownHTML}</div></div><div class="edit-controls"><button class="save-btn edit-btn-action">Kaydet</button><button class="cancel-btn edit-btn-action">İptal</button></div>`;
        const newPersonnelContainer = taskItem.querySelector('#edit-personnel-container');
        const newDependenciesContainer = taskItem.querySelector('#edit-dependencies-container');
        setupCustomSelect(newPersonnelContainer);
        setupCustomSelect(newDependenciesContainer);
        updateCustomSelectButtonText(newPersonnelContainer.querySelector('.select-button-text'), newPersonnelContainer.querySelector('.custom-select-options'), 'Personel Seçin', 'personel');
        updateCustomSelectButtonText(newDependenciesContainer.querySelector('.select-button-text'), newDependenciesContainer.querySelector('.custom-select-options'), 'Bağımlılık Seçin', 'bağımlılık');
        taskItem.querySelector(".save-btn").addEventListener("click", async () => {
            const selectedAssignees = Array.from(newPersonnelContainer.querySelectorAll('input:checked')).map(checkbox => parseInt(checkbox.parentElement.dataset.value));
            const selectedDeps = Array.from(newDependenciesContainer.querySelectorAll('input:checked')).map(checkbox => Number(checkbox.parentElement.dataset.value));
            const updates = { text: taskItem.querySelector(".edit-input").value.trim(), dueDate: taskItem.querySelector(".edit-date").value, assignedTo: selectedAssignees, depends_on: selectedDeps };
            if (updates.text !== "" && updates.assignedTo.length > 0) {
                await updateTaskAPI(taskId, updates);
                await renderTasks();
            } else {
                alert("Görev metni boş olamaz ve en az bir personel seçilmelidir!");
            }
        });
        taskItem.querySelector(".cancel-btn").addEventListener("click", () => renderTasks());
    };

    // DÜZELTME: Bu fonksiyonun tam içeriği eklendi
    const openTaskModal = async (taskId) => {
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
            descriptionEditInput.value = task.description || '';
            descriptionView.style.display = 'block';
            descriptionEditView.style.display = 'none';
            if (currentUser.role === 'admin') { editDescriptionBtn.style.display = 'inline-block'; }
            else { editDescriptionBtn.style.display = 'none'; }
            modalCommentsList.innerHTML = '';
            if (task.comments && task.comments.length > 0) {
                task.comments.forEach(c => {
                    const el = document.createElement('div'); el.className = 'comment-item'; el.dataset.commentId = c.comment_id; let controlsHTML = '';
                    if (c.can_edit) { controlsHTML = `<div class="comment-controls"><button class="control-btn edit-comment-btn" title="Düzenle"><i class="fa-solid fa-pencil"></i></button><button class="control-btn delete-btn-icon delete-comment-btn" title="Sil"><i class="fa-solid fa-trash-can"></i></button></div>`; }
                    el.innerHTML = `<div class="comment-content"><p class="comment-author">${c.author_username} <span class="comment-date">- ${formatDate(c.timestamp, true)}</span></p><p class="comment-text">${c.text}</p></div>${controlsHTML}`;
                    modalCommentsList.appendChild(el);
                });
            } else { modalCommentsList.innerHTML = '<p>Henüz yorum yapılmamış.</p>'; }
            modalFilesList.innerHTML = '';
            if (task.files && task.files.length > 0) {
                task.files.forEach(f => {
                    const el = document.createElement('div'); el.className = 'file-item';
                    el.innerHTML = `<a href="/uploads/${f.stored_name}" target="_blank">${f.original_name}</a><div class="file-controls"><button class="control-btn delete-btn-icon delete-file-btn" data-filename="${f.stored_name}" title="Dosyayı Sil"><i class="fa-solid fa-times"></i></button></div>`;
                    modalFilesList.appendChild(el);
                });
            } else { modalFilesList.innerHTML = '<p>Bu göreve henüz dosya eklenmemiş.</p>'; }
            const activityLogContainer = document.querySelector('.activity-log-container');
            if (task.activity_log) {
                activityLogContainer.style.display = 'block';
                modalActivityLog.innerHTML = '';
                if (task.activity_log.length > 0) {
                    task.activity_log.slice().reverse().forEach(log => {
                        const li = document.createElement('li'); li.className = 'activity-log-item';
                        li.innerHTML = `<span class="log-user">${log.user}</span> ${log.action} <span class="log-time">${formatDate(log.timestamp, true)}</span>`;
                        modalActivityLog.appendChild(li);
                    });
                } else { modalActivityLog.innerHTML = '<li class="activity-log-item">Bu görev için henüz bir aktivite yok.</li>'; }
            } else { activityLogContainer.style.display = 'none'; }
            taskModal.style.display = 'flex';
        } catch (error) { console.error(error); alert('Görev detayları yüklenemedi.'); }
    };

    const closeTaskModal = () => {
        taskModal.style.display = "none";
        currentTaskId = null;
        modalCommentInput.value = "";
        if (modalFileInput) modalFileInput.value = "";
    };

    const handleAddComment = async () => {
        const text = modalCommentInput.value.trim();
        if (!text || !currentTaskId) return;
        try {
            await fetch(`/api/tasks/${currentTaskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
            await openTaskModal(currentTaskId);
            modalCommentInput.value = "";
        } catch (error) { alert('Yorum eklenirken bir hata oluştu.'); }
    };

    const handleFileUpload = async () => {
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

    const initPage = async () => {
        await loadInitialData();
        await renderTasks();
        await populateDependenciesDropdown();
        setupCustomSelect(assignToContainer);
        setupCustomSelect(dependenciesContainer);
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.custom-select-container')) {
                document.querySelectorAll('.custom-select-options').forEach(opt => opt.style.display = 'none');
                document.querySelectorAll('.custom-select-container').forEach(cont => cont.classList.remove('open'));
            }
        });

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', async () => {
                const assignedToIds = Array.from(assignToOptions.querySelectorAll('input:checked')).map(checkbox => parseInt(checkbox.parentElement.dataset.value));
                const dependencyIds = Array.from(dependenciesOptions.querySelectorAll('input:checked')).map(checkbox => parseInt(checkbox.parentElement.dataset.value));
                const task = { text: taskInput.value.trim(), description: descriptionInput.value.trim(), dueDate: dueDateInput.value, assignedTo: assignedToIds, priority: prioritySelect.value, depends_on: dependencyIds };
                if (task.text === '' || assignedToIds.length === 0) { return alert('Lütfen görev metnini ve en az bir personeli seçin.'); }
                await addTask(task);
                await renderTasks();
                await populateDependenciesDropdown();
                taskInput.value = ''; descriptionInput.value = ''; dueDateInput.value = '';
                assignToOptions.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
                dependenciesOptions.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
                updateCustomSelectButtonText(assignToButtonText, assignToOptions, 'Personel Seçin', 'personel');
                updateCustomSelectButtonText(dependenciesButtonText, dependenciesOptions, 'Bağımlılık Seçin', 'bağımlılık');
            });
        }

        if (taskList) {
            taskList.addEventListener('click', async (event) => {
                const taskItem = event.target.closest('.task-item');
                if (!taskItem || taskItem.classList.contains('editing')) return;
                const taskId = Number(taskItem.dataset.id);
                const editButton = event.target.closest('.edit-btn');
                const deleteButton = event.target.closest('.delete-btn');
                const checkbox = event.target.closest('.task-checkbox');
                if (editButton && !editButton.disabled) { await toggleEditMode(taskItem); }
                else if (deleteButton) { if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) { taskItem.classList.add('removing'); taskItem.addEventListener('transitionend', async () => { await deleteTaskAPI(taskId); await renderTasks(); }, { once: true }); } }
                else if (checkbox && !checkbox.disabled) {
                    await updateTaskAPI(taskId, { completed: checkbox.checked });
                    if (checkbox.checked && typeof confetti === 'function') { confetti({ particleCount: 150, spread: 90, origin: { y: 0.7 }, zIndex: 1050 }); }
                    setTimeout(renderTasks, 100);
                }
                else if (!taskItem.classList.contains('blocked')) { openTaskModal(taskId); }
            });
        }

        if (taskModal) {
            modalCloseBtn.addEventListener('click', closeTaskModal);
            taskModal.addEventListener('click', (event) => { if (event.target === taskModal) closeTaskModal(); });
            modalAddCommentBtn.addEventListener('click', handleAddComment);
            modalUploadBtn.addEventListener('click', handleFileUpload);
            editDescriptionBtn.addEventListener('click', () => { descriptionView.style.display = 'none'; descriptionEditView.style.display = 'block'; });
            cancelDescriptionBtn.addEventListener('click', () => { descriptionView.style.display = 'block'; descriptionEditView.style.display = 'none'; });
            saveDescriptionBtn.addEventListener('click', async () => { const newDescription = descriptionEditInput.value.trim(); await updateTaskAPI(currentTaskId, { description: newDescription }); await openTaskModal(currentTaskId); });
            modalCommentsList.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.edit-comment-btn'); const deleteBtn = e.target.closest('.delete-comment-btn');
                const saveBtn = e.target.closest('.comment-save-btn'); const cancelBtn = e.target.closest('.comment-cancel-btn');
                const commentItem = e.target.closest('.comment-item'); if (!commentItem) return; const commentId = commentItem.dataset.commentId;
                if (editBtn) {
                    const contentDiv = commentItem.querySelector('.comment-content'); const textP = commentItem.querySelector('.comment-text'); const originalText = textP.textContent;
                    contentDiv.style.display = 'none';
                    commentItem.insertAdjacentHTML('beforeend', `<div class="comment-edit-view"><input type="text" class="comment-edit-input" value="${originalText}"><div class="comment-edit-actions"><button class="comment-save-btn">Kaydet</button><button class="comment-cancel-btn">İptal</button></div></div>`);
                }
                if (deleteBtn) { if (confirm('Bu yorumu silmek istediğinizden emin misiniz?')) { await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'DELETE' }); await openTaskModal(currentTaskId); } }
                if (cancelBtn) { commentItem.querySelector('.comment-edit-view').remove(); commentItem.querySelector('.comment-content').style.display = 'block'; }
                if (saveBtn) {
                    const newText = commentItem.querySelector('.comment-edit-input').value.trim();
                    if (newText) { await fetch(`/api/tasks/${currentTaskId}/comments/${commentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText }) }); await openTaskModal(currentTaskId); }
                }
            });
            modalFilesList.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.delete-file-btn');
                if (deleteBtn) {
                    const storedFilename = deleteBtn.dataset.filename; const originalFilename = deleteBtn.closest('.file-item').querySelector('a').textContent;
                    if (confirm(`'${originalFilename}' dosyasını silmek istediğinizden emin misiniz?`)) { await fetch(`/api/tasks/${currentTaskId}/files/${storedFilename}`, { method: 'DELETE' }); await openTaskModal(currentTaskId); }
                }
            });
        }

        if (logoutBtn) { logoutBtn.addEventListener('click', logout); }
    };

    initPage();
});