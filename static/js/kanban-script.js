document.addEventListener('DOMContentLoaded', async() => {
    // API'den tüm görevleri çek
    const getTasks = async() => {
        const response = await fetch('/api/tasks');
        return await response.json();
    };

    // Bir görevin durumunu güncellemek için API'ye istek gönder
    const updateTaskStatus = async(taskId, newStatus) => {
        // "done" durumuna gelince 'completed' alanını da güncelle
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
        card.setAttribute('draggable', 'true'); // Sürüklenebilir yap
        card.dataset.id = task.id; // Görev ID'sini sakla

        let priorityText = 'Normal';
        if (task.priority === 'high') priorityText = 'Yüksek';
        if (task.priority === 'low') priorityText = 'Düşük';

        card.innerHTML = `
            <p class="task-card-text">${task.text}</p>
            <div class="task-card-footer">
                <span class="assigned-user-badge">${task.assignedToUsername.charAt(0)}</span>
                <span class="priority-tag priority-${task.priority || 'normal'}">${priorityText}</span>
            </div>
        `;
        return card;
    };

    // Tüm görevleri çekip ilgili sütunlara yerleştir
    const renderBoard = async() => {
        const tasks = await getTasks();
        // Sütunları temizle
        document.getElementById('todo-tasks').innerHTML = '';
        document.getElementById('inprogress-tasks').innerHTML = '';
        document.getElementById('done-tasks').innerHTML = '';

        tasks.forEach(task => {
            const card = createTaskCard(task);
            // Eğer bir görevin status'u yoksa (eski görevler gibi), onu 'todo' varsay
            const columnId = `${task.status || 'todo'}-tasks`;
            const column = document.getElementById(columnId);
            if (column) {
                column.appendChild(card);
            }
        });

        // Sürükle-bırak olay dinleyicilerini ekle
        addDragAndDropListeners();
    };

    // Sürükle-Bırak Fonksiyonları
    const addDragAndDropListeners = () => {
        const taskCards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.kanban-column .tasks-container');

        let draggedCard = null;

        // Her bir görev kartı için dinleyiciler
        taskCards.forEach(card => {
            card.addEventListener('dragstart', () => {
                draggedCard = card;
                setTimeout(() => {
                    // Sürüklemeye başlandığında karta bir class ekleyerek stilini değiştir
                    card.classList.add('dragging');
                }, 0);
            });

            card.addEventListener('dragend', () => {
                // Sürükleme bittiğinde stil class'ını kaldır
                card.classList.remove('dragging');
                draggedCard = null;
            });
        });

        // Her bir sütun için dinleyiciler
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                // Bu olay, bir elementin başka bir elementin üzerine sürüklenmesine izin vermek için gereklidir
                e.preventDefault();
            });

            column.addEventListener('drop', async(e) => {
                e.preventDefault();
                if (!draggedCard) return;

                // Kartı görsel olarak yeni sütuna ekle
                column.appendChild(draggedCard);

                const taskId = draggedCard.dataset.id;
                const newStatus = column.parentElement.dataset.status;

                // Backend'e (API'ye) bu değişikliği kaydetmesi için haber ver
                await updateTaskStatus(taskId, newStatus);
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

    // Sayfa ilk yüklendiğinde panoyu çizerek uygulamayı başlat
    await renderBoard();
});