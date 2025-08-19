document.addEventListener('DOMContentLoaded', () => {
    const personnelList = document.getElementById('personnel-list');
    const addForm = document.getElementById('add-personnel-form');
    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const errorMessage = document.getElementById('add-user-error');
    const logoutBtn = document.getElementById('logout-btn');

    // API ile konuşacak tüm fonksiyonları bir obje içinde topluyoruz
    const api = {
        get: async() => (await fetch('/api/personnel')).json(),
        add: async(username, password) => await fetch('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }),
        delete: async(id) => await fetch(`/api/personnel/${id}`, { method: 'DELETE' }),
        update: async(id, data) => await fetch(`/api/personnel/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    };

    // Personel listesini backend'den alıp ekrana çizen ana fonksiyon
    const render = async() => {
        const personnel = await api.get();
        personnelList.innerHTML = ''; // Her seferinde listeyi temizle
        personnel.forEach(user => {
            const li = document.createElement('li');
            li.className = 'personnel-list-item';
            li.dataset.id = user.id;
            li.innerHTML = `
                <div class="personnel-info">
                    <span class="personnel-username">${user.username}</span>
                </div>
                <div class="personnel-controls">
                    <button class="edit-personnel-btn"><i class="fa-solid fa-pencil"></i></button>
                    <button class="delete-personnel-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            personnelList.appendChild(li);
        });
    };

    // Bir personel satırını düzenleme formuna çeviren fonksiyon
    const toggleEditMode = (item) => {
        const userId = item.dataset.id;
        const originalUsername = item.querySelector('.personnel-username').textContent;
        item.classList.add('editing'); // Satıra düzenleme modu stili ekle

        // Satırın içeriğini input alanları ve butonlarla değiştir
        item.innerHTML = `
            <div class="personnel-info-edit">
                <input type="text" class="edit-username-input" value="${originalUsername}">
                <input type="text" class="edit-password-input" placeholder="Yeni Şifre (değişmeyecekse boş bırakın)">
            </div>
            <div class="personnel-controls-edit">
                <button class="save-personnel-btn edit-btn-action">Kaydet</button>
                <button class="cancel-personnel-btn edit-btn-action">İptal</button>
            </div>`;

        // YENİ OLUŞTURULAN "KAYDET" BUTONUNA TIKLAMA ÖZELLİĞİ EKLE
        item.querySelector('.save-personnel-btn').addEventListener('click', async() => {
            const newUsername = item.querySelector('.edit-username-input').value.trim();
            const newPassword = item.querySelector('.edit-password-input').value.trim();

            if (!newUsername) return alert('Kullanıcı adı boş olamaz.');

            const updates = { username: newUsername };
            if (newPassword) updates.password = newPassword; // Sadece şifre girildiyse gönder

            const response = await api.update(userId, updates);

            if (response.ok) {
                await render(); // Başarılıysa listeyi yenile
            } else {
                // Backend'den gelen "kullanıcı adı zaten alınmış" gibi hataları göster
                const data = await response.json();
                alert(data.message || 'Güncelleme başarısız oldu.');
            }
        });

        // YENİ OLUŞTURULAN "İPTAL" BUTONUNA TIKLAMA ÖZELLİĞİ EKLE
        item.querySelector('.cancel-personnel-btn').addEventListener('click', render); // İptale basınca listeyi yenile
    };

    // Liste üzerindeki genel tıklama dinleyicisi (Silme ve Düzenleme için)
    personnelList.addEventListener('click', (e) => {
        const item = e.target.closest('.personnel-list-item');
        if (!item || item.classList.contains('editing')) return;

        if (e.target.closest('.delete-personnel-btn')) {
            if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
                api.delete(item.dataset.id).then(render);
            }
        }
        if (e.target.closest('.edit-personnel-btn')) {
            toggleEditMode(item);
        }
    });

    // Yeni personel ekleme formu dinleyicisi
    addForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const username = newUsernameInput.value.trim();
        const password = newPasswordInput.value.trim();
        if (!username || !password) return alert('Kullanıcı adı ve şifre boş olamaz.');

        const response = await api.add(username, password);
        if (response.ok) {
            addForm.reset();
            errorMessage.style.display = 'none';
            await render();
        } else {
            errorMessage.textContent = (await response.json()).message || 'Bir hata oluştu.';
            errorMessage.style.display = 'block';
        }
    });

    // Çıkış butonu dinleyicisi
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    // Sayfa ilk yüklendiğinde personel listesini ekrana çiz
    render();
});