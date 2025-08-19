import json
import time
import os
import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'bu-anahtar-cok-daha-guvenli-olmali'

# --- YENİ EKLENEN AYARLAR ---
# Veritabanı yolları ve dosya yükleme klasörü
TASKS_DB_PATH = 'db/tasks.json'
USERS_DB_PATH = 'db/users.json'
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# ------------------------------

def read_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return []
def write_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f: json.dump(data, f, indent=4, ensure_ascii=False)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Bu işlem için giriş yapmalısınız'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# --- Sayfa Rotaları ---
@app.route('/')
def login_page():
    if 'user_id' in session: return redirect(url_for('yonetici_paneli') if session.get('role') == 'admin' else url_for('personel_paneli'))
    return render_template('index.html')

@app.route('/yonetici')
@login_required
def yonetici_paneli():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('yonetici.html')

@app.route('/personel')
@login_required
def personel_paneli():
    if session.get('role') != 'employee': return redirect(url_for('yonetici_paneli'))
    return render_template('personel.html')

@app.route('/kanban')
@login_required
def kanban_panosu():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('kanban.html')

@app.route('/personel-kanban')
@login_required
def personel_kanban_sayfasi():
    if session.get('role') != 'employee': return redirect(url_for('yonetici_paneli'))
    return render_template('personel-kanban.html')

@app.route('/personel-yonetimi')
@login_required
def personel_yonetimi_sayfasi():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('personel-yonetimi.html')

# --- API Rotaları ---
@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    users = read_json(USERS_DB_PATH)
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)
    if user: session.update(user_id=user['id'], username=user['username'], role=user['role']); return jsonify({'success': True, 'role': user['role']})
    return jsonify({'success': False, 'message': 'Kullanıcı adı veya şifre hatalı'}), 401

@app.route('/api/logout', methods=['POST'])
def logout_api(): session.clear(); return jsonify({'success': True})

@app.route('/api/initial_data', methods=['GET'])
@login_required
def get_initial_data():
    users = read_json(USERS_DB_PATH)
    personnel_list = [{'id': u['id'], 'username': u['username']} for u in users if u['role'] == 'employee']
    current_user_data = {'username': session.get('username'), 'role': session.get('role')}
    return jsonify({'currentUser': current_user_data, 'personnel': personnel_list})

@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def handle_tasks():
    if request.method == 'POST':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        new_task_data = request.get_json()
        new_task_data.update({
            'status': 'todo', 
            'id': int(time.time() * 1000),
            'description': '',
            'comments': [],
            'files': []
        })
        tasks = read_json(TASKS_DB_PATH)
        tasks.append(new_task_data)
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(new_task_data), 201
    tasks = read_json(TASKS_DB_PATH)
    users = read_json(USERS_DB_PATH)
    user_map = {user['id']: user['username'] for user in users}
    for task in tasks: task['assignedToUsername'] = user_map.get(task.get('assignedTo'), 'Bilinmiyor')
    if session['role'] == 'admin': return jsonify(tasks)
    user_tasks = [t for t in tasks if str(t.get('assignedTo')) == str(session['user_id'])]
    return jsonify(user_tasks)

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def handle_single_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task_index, task = next(((i, t) for i, t in enumerate(tasks) if t['id'] == task_id), (None, None))
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404

    if request.method == 'GET':
        users = read_json(USERS_DB_PATH)
        user_map = {user['id']: user['username'] for user in users}
        task['assignedToUsername'] = user_map.get(task.get('assignedTo'), 'Bilinmiyor')
        return jsonify(task)

    if request.method == 'DELETE':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        tasks.pop(task_index)
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True}), 200
        
    if request.method == 'PUT':
        updates = request.get_json()
        is_owner = str(task.get('assignedTo')) == str(session['user_id'])
        if session.get('role') == 'admin': task.update(updates)
        elif is_owner:
            allowed_updates = {k: v for k, v in updates.items() if k in ['status', 'completed']}
            if not allowed_updates: return jsonify({'error': 'Bu alanları güncelleme yetkiniz yok'}), 403
            task.update(allowed_updates)
        else: return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(task), 200

# --- YORUM VE DOSYA YÖNETİMİ İÇİN YENİ EKLENEN API'LER ---

@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@login_required
def add_comment(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404

    data = request.get_json()
    comment_text = data.get('text')
    if not comment_text: return jsonify({'error': 'Yorum metni boş olamaz'}), 400

    if 'comments' not in task: task['comments'] = []

    new_comment = {
        'comment_id': int(time.time() * 1000),
        'author_username': session['username'],
        'text': comment_text,
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z'
    }
    task['comments'].append(new_comment)
    write_json(TASKS_DB_PATH, tasks)
    return jsonify(new_comment), 201

@app.route('/api/tasks/<int:task_id>/upload', methods=['POST'])
@login_required
def upload_file_to_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404
    
    if 'file' not in request.files: return jsonify({'error': 'İstekte dosya bulunamadı'}), 400
    
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'Dosya seçilmedi'}), 400

    if file:
        original_filename = secure_filename(file.filename)
        stored_filename = f"{int(time.time())}_{original_filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], stored_filename))

        if 'files' not in task: task['files'] = []
        
        task['files'].append({
            'original_name': original_filename,
            'stored_name': stored_filename
        })
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True, 'filename': original_filename}), 200

@app.route('/uploads/<filename>')
@login_required
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# -------------------------------------------------------------

@app.route('/api/personnel', methods=['GET', 'POST'])
@login_required
def handle_personnel():
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    users = read_json(USERS_DB_PATH)
    if request.method == 'GET':
        personnel = [{'id': u['id'], 'username': u['username']} for u in users if u['role'] == 'employee']
        return jsonify(personnel)
    if request.method == 'POST':
        data = request.get_json()
        username, password = data.get('username'), data.get('password')
        if not username or not password: return jsonify({'message': 'Kullanıcı adı ve şifre gereklidir'}), 400
        if any(u['username'] == username for u in users): return jsonify({'message': 'Bu kullanıcı adı zaten alınmış'}), 409
        new_user = {'id': int(time.time() * 1000), 'username': username, 'password': password, 'role': 'employee'}
        users.append(new_user)
        write_json(USERS_DB_PATH, users)
        return jsonify({'message': 'Personel başarıyla eklendi', 'user': new_user}), 201

@app.route('/api/personnel/<int:user_id>', methods=['PUT', 'DELETE'])
@login_required
def handle_single_personnel(user_id):
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    users = read_json(USERS_DB_PATH)
    user_to_modify = next((u for u in users if u['id'] == user_id and u['role'] == 'employee'), None)
    if user_to_modify is None: return jsonify({'error': 'Personel bulunamadı'}), 404
    if request.method == 'DELETE':
        users = [u for u in users if u['id'] != user_id]
        write_json(USERS_DB_PATH, users)
        return jsonify({'success': True, 'message': 'Personel silindi'}), 200
    if request.method == 'PUT':
        updates = request.get_json()
        new_username, new_password = updates.get('username'), updates.get('password')
        if new_username and any(u['username'] == new_username and u['id'] != user_id for u in users):
            return jsonify({'message': 'Bu kullanıcı adı zaten alınmış'}), 409
        if new_username: user_to_modify['username'] = new_username
        if new_password: user_to_modify['password'] = new_password
        write_json(USERS_DB_PATH, users)
        return jsonify({'message': 'Personel güncellendi', 'user': user_to_modify}), 200

if __name__ == '__main__':
    # 'uploads' klasörünün varlığını kontrol et, yoksa oluştur
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(host='0.0.0.0', port=5000, debug=True)