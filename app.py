import json
from flask import Flask, render_template

# Flask uygulamasını başlat
app = Flask(__name__)

# Veritabanı dosyalarının yolları
TASKS_DB_PATH = 'db/tasks.json'
USERS_DB_PATH = 'db/users.json'

def read_json_file(file_path):
    """JSON dosyasını okuyan yardımcı fonksiyon"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.route('/')
def home():
    """Ana sayfayı oluşturur ve görevleri listeler"""
    tasks = read_json_file(TASKS_DB_PATH)
    users = read_json_file(USERS_DB_PATH)

    # Kullanıcı ID'lerini kullanıcı adlarıyla eşleştirmek için bir sözlük oluşturalım
    user_map = {user['id']: user['username'] for user in users}

    # Görevlerdeki atanan ve oluşturan ID'lerini kullanıcı adlarıyla değiştirelim
    for task in tasks:
        task['assigned_to_username'] = user_map.get(task['assigned_to'], 'Bilinmiyor')
        task['created_by_username'] = user_map.get(task['created_by'], 'Bilinmiyor')

    return render_template('index.html', tasks=tasks)

if __name__ == '__main__':
    # Debug modu açık şekilde sunucuyu çalıştır
    # Bu mod, kodda değişiklik yaptığınızda sunucunun otomatik yeniden başlamasını sağlar
    app.run(debug=True)