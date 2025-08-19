document.addEventListener('DOMContentLoaded', async() => {
    // API'den (sadece bu personele ait) görevleri çek
    const getTasks = async() => {
        const response = await fetch('/api/tasks');
        return await response.json();
    };

    // Bir görevin durumunu güncellemek için API'ye istek gönder
    const updateTaskStatus = async(taskId, newStatus) => {
        const isCompleted = newStatus === 'done';
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, completed: isCompleted })
        });
    };

    // Görev kartı HTML'ini oluşturur
    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.classList.add('task-card');
        card.setAttribute('draggable', 'true');
        card.dataset.id = task.id;

        let priorityText = 'Normal';
        if (task.priority === 'high') priorityText = 'Yüksek';
        if (task.priority === 'low') priorityText = 'Düşük';

        card.innerHTML = `
            <p class="task-card-text">${task.text}</p>
            <div class="task-card-footer">
                <span class="priority-tag priority-${task.priority || 'normal'}">${priorityText}</span>
            </div>
        `;
        return card;
    };

    // Tüm görevleri çekip ilgili sütunlara yerleştir
    const renderBoard = async() => {
        const tasks = await getTasks();
        document.getElementById('todo-tasks').innerHTML = '';
        document.getElementById('inprogress-tasks').innerHTML = '';
        document.getElementById('done-tasks').innerHTML = '';

        tasks.forEach(task => {
            const card = createTaskCard(task);
            const columnId = `${task.status || 'todo'}-tasks`;
            const column = document.getElementById(columnId);
            if (column) {
                column.appendChild(card);
            }
        });

        addDragAndDropListeners();
    };

    // Sürükle-Bırak Fonksiyonları
    const addDragAndDropListeners = () => {
        const taskCards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.kanban-column .tasks-container');
        let draggedCard = null;
        taskCards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedCard = card;
                setTimeout(() => { card.classList.add('dragging'); }, 0);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedCard = null;
            });
        });
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => { e.preventDefault(); });
            column.addEventListener('drop', async(e) => {
                e.preventDefault();
                if (!draggedCard) return;
                column.appendChild(draggedCard);
                const taskId = draggedCard.dataset.id;
                const newStatus = column.parentElement.dataset.status;
                await updateTaskStatus(taskId, newStatus);
                // Başka bir personelin panosunu anlık güncellemek için daha gelişmiş teknolojiler (WebSocket) gerekir.
                // Şimdilik, yönetici sayfayı yenilediğinde güncel hali görecektir.
            });
        });
    };

    // Çıkış Butonu
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    // Uygulamayı başlat
    await renderBoard();
});