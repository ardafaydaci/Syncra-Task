import json
import time
import os
from datetime import datetime, date
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'bu-anahtar-cok-daha-guvenli-olmali'

TASKS_DB_PATH = 'db/tasks.json'
USERS_DB_PATH = 'db/users.json'
NOTIFICATIONS_DB_PATH = 'db/notifications.json'
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
    if 'user_id' in session: return redirect(url_for('dashboard_sayfasi') if session.get('role') == 'admin' else url_for('personel_paneli'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard_sayfasi():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('dashboard.html')

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

@app.route('/personnel-performance')
@login_required
def personnel_performance_page():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('personnel-performance.html')

# --- YENİ EKLENEN TAKVİM SAYFASI ROUTE'U ---
@app.route('/takvim')
@login_required
def takvim_sayfasi():
    return render_template('takvim.html')

# --- API Rotaları ---

# --- YENİ EKLENEN TAKVİM API ROUTE'U ---
@app.route('/api/calendar-tasks')
@login_required
def get_calendar_tasks():
    all_tasks = read_json(TASKS_DB_PATH)
    
    tasks_to_show = []
    if session.get('role') == 'admin':
        tasks_to_show = all_tasks
    else:
        user_id = session.get('user_id')
        tasks_to_show = [t for t in all_tasks if t.get('assignedTo') == user_id]

    calendar_events = []
    for task in tasks_to_show:
        if task.get('dueDate'):
            color = '#3498db' # Normal (Mavi)
            if task.get('priority') == 'high': color = '#e74c3c' # Yüksek (Kırmızı)
            elif task.get('priority') == 'low': color = '#f1c40f' # Düşük (Sarı)
            
            calendar_events.append({
                'id': task.get('id'),
                'title': task.get('text'),
                'start': task.get('dueDate'),
                'color': color,
                'allDay': True
            })
            
    return jsonify(calendar_events)
    
# --- (Mevcut diğer tüm API route'larınız burada devam ediyor, değişiklik yok) ---
# ... (handle_tasks, handle_single_task, vb. tüm diğer route'lar aynı kalacak) ...
@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def handle_tasks():
    if request.method == 'POST':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        new_task_data = request.get_json()
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        new_task_data.update({
            'status': 'todo', 
            'id': int(time.time() * 1000), 
            'description': '', 
            'comments': [], 
            'files': [],
            'creationDate': timestamp,
            'completionDate': None,
            'history': [{'status': 'todo', 'timestamp': timestamp}]
        })
        tasks = read_json(TASKS_DB_PATH)
        tasks.append(new_task_data)
        write_json(TASKS_DB_PATH, tasks)
        
        assigned_user_id = new_task_data.get('assignedTo')
        if assigned_user_id:
            notifications = read_json(NOTIFICATIONS_DB_PATH)
            new_notification = {
                'id': int(time.time() * 1000),
                'user_id': assigned_user_id,
                'task_id': new_task_data.get('id'),
                'message': f"Size yeni bir görev atandı: '{new_task_data.get('text')}'",
                'read': False,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
            notifications.append(new_notification)
            write_json(NOTIFICATIONS_DB_PATH, notifications)
        
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

    if request.method == 'PUT':
        updates = request.get_json()
        current_status = task.get('status', 'todo')
        new_status = updates.get('status')
        if new_status and new_status != current_status:
            timestamp = datetime.utcnow().isoformat() + 'Z'
            if 'history' not in task: task['history'] = []
            task['history'].append({'status': new_status, 'timestamp': timestamp})
        if updates.get('completed') and not task.get('completed'):
            task['completionDate'] = datetime.utcnow().isoformat() + 'Z'
        elif not updates.get('completed'):
            task['completionDate'] = None
        is_owner = str(task.get('assignedTo')) == str(session['user_id'])
        if session.get('role') == 'admin': 
            task.update(updates)
        elif is_owner:
            allowed_updates = {k: v for k, v in updates.items() if k in ['status', 'completed']}
            if not allowed_updates: return jsonify({'error': 'Bu alanları güncelleme yetkiniz yok'}), 403
            task.update(allowed_updates)
        else: return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(task), 200

    if request.method == 'GET':
        users = read_json(USERS_DB_PATH)
        user_map = {user['id']: user['username'] for user in users}
        task['assignedToUsername'] = user_map.get(task.get('assignedTo'), 'Bilinmiyor')
        if 'comments' in task:
            for comment in task['comments']:
                comment['can_edit'] = (comment['author_username'] == session.get('username') or session.get('role') == 'admin')
        return jsonify(task)
    if request.method == 'DELETE':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        tasks.pop(task_index)
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True}), 200

@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@login_required
def add_comment_to_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404
    data = request.get_json()
    comment_text = data.get('text')
    if not comment_text: return jsonify({'error': 'Yorum metni boş olamaz'}), 400
    new_comment = {
        'comment_id': int(time.time() * 1000),
        'author_username': session.get('username'),
        'text': comment_text,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    if 'comments' not in task:
        task['comments'] = []
    task['comments'].append(new_comment)
    write_json(TASKS_DB_PATH, tasks)
    
    assigned_user_id = task.get('assignedTo')
    if assigned_user_id and assigned_user_id != session.get('user_id'):
        notifications = read_json(NOTIFICATIONS_DB_PATH)
        new_notification = {
            'id': int(time.time() * 1000),
            'user_id': assigned_user_id,
            'task_id': task_id,
            'message': f"'{session.get('username')}' kullanıcısı '{task.get('text')}' görevine bir yorum yaptı.",
            'read': False,
            'timestamp': new_comment.get('timestamp')
        }
        notifications.append(new_notification)
        write_json(NOTIFICATIONS_DB_PATH, notifications)
    
    return jsonify(new_comment), 201

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    notifications = read_json(NOTIFICATIONS_DB_PATH)
    user_id = session.get('user_id')
    unread_notifications = [n for n in notifications if n.get('user_id') == user_id and not n.get('read')]
    sorted_notifications = sorted(unread_notifications, key=lambda x: x['timestamp'], reverse=True)
    return jsonify(sorted_notifications)

@app.route('/api/notifications/mark-as-read', methods=['POST'])
@login_required
def mark_notifications_as_read():
    notifications = read_json(NOTIFICATIONS_DB_PATH)
    user_id = session.get('user_id')
    for notification in notifications:
        if notification.get('user_id') == user_id and not notification.get('read'):
            notification['read'] = True
    write_json(NOTIFICATIONS_DB_PATH, notifications)
    return jsonify({'success': True, 'message': 'Bildirimler okundu olarak işaretlendi.'})

@app.route('/api/personnel-stats/<int:user_id>')
@login_required
def get_personnel_stats(user_id):
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    all_tasks = read_json(TASKS_DB_PATH)
    personnel_tasks = [t for t in all_tasks if t.get('assignedTo') == user_id]
    if not personnel_tasks: return jsonify({'total_assigned': 0, 'completed_count': 0, 'completion_rate': 0, 'on_time_count': 0, 'on_time_rate': 0, 'overdue_count': 0, 'in_progress_count': 0, 'todo_count': 0, 'recent_activity': []})
    total_assigned, completed_count, on_time_count, overdue_count, in_progress_count = len(personnel_tasks), 0, 0, 0, 0
    today = date.today()
    for task in personnel_tasks:
        if task.get('completed'):
            completed_count += 1
            due_date_str, completion_date_str = task.get('dueDate'), task.get('completionDate')
            if due_date_str and completion_date_str:
                due_date_obj = datetime.strptime(due_date_str, '%Y-%m-%d').date()
                completion_date_obj = datetime.fromisoformat(completion_date_str.replace('Z', '')).date()
                if completion_date_obj <= due_date_obj: on_time_count += 1
        if not task.get('completed') and task.get('dueDate'):
             if datetime.strptime(task['dueDate'], '%Y-%m-%d').date() < today: overdue_count += 1
        if task.get('status') == 'inprogress': in_progress_count += 1
    todo_count = total_assigned - completed_count - in_progress_count
    stats = {'total_assigned': total_assigned, 'completed_count': completed_count, 'completion_rate': round((completed_count / total_assigned) * 100) if total_assigned > 0 else 0, 'on_time_count': on_time_count, 'on_time_rate': round((on_time_count / completed_count) * 100) if completed_count > 0 else 0, 'overdue_count': overdue_count, 'in_progress_count': in_progress_count, 'todo_count': todo_count, 'recent_activity': sorted(personnel_tasks, key=lambda t: t.get('creationDate', ''), reverse=True)[:5]}
    return jsonify(stats)

@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    users = read_json(USERS_DB_PATH)
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)
    if user: session.update(user_id=user['id'], username=user['username'], role=user['role']); redirect_url = '/dashboard' if user['role'] == 'admin' else '/personel'; return jsonify({'success': True, 'role': user['role'], 'redirect_url': redirect_url})
    return jsonify({'success': False, 'message': 'Kullanıcı adı veya şifre hatalı'}), 401

@app.route('/api/dashboard-stats')
@login_required
def get_dashboard_stats():
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    tasks, users = read_json(TASKS_DB_PATH), read_json(USERS_DB_PATH)
    user_map = {user['id']: user['username'] for user in users}
    total_tasks, completed_tasks, in_progress_tasks, todo_tasks, overdue_tasks = len(tasks), 0, 0, 0, 0
    today = date.today()
    for task in tasks:
        if task.get('completed') or task.get('status') == 'done': completed_tasks += 1
        elif task.get('status') == 'inprogress': in_progress_tasks += 1
        else: todo_tasks += 1
        if not task.get('completed') and task.get('dueDate'):
            try:
                if datetime.strptime(task['dueDate'], '%Y-%m-%d').date() < today: overdue_tasks += 1
            except ValueError: continue
    recent_tasks = sorted(tasks, key=lambda t: t.get('id', 0), reverse=True)[:5]
    for task in recent_tasks: task['assignedToUsername'] = user_map.get(task.get('assignedTo'), 'Bilinmiyor')
    stats = {'total_tasks': total_tasks, 'completed_tasks': completed_tasks, 'in_progress_tasks': in_progress_tasks, 'todo_tasks': todo_tasks, 'overdue_tasks': overdue_tasks, 'recent_tasks': recent_tasks}
    return jsonify(stats)

@app.route('/api/logout', methods=['POST'])
def logout_api(): session.clear(); return jsonify({'success': True})

@app.route('/api/initial_data', methods=['GET'])
@login_required
def get_initial_data():
    users = read_json(USERS_DB_PATH)
    personnel_list = [{'id': u['id'], 'username': u['username']} for u in users if u['role'] == 'employee']
    current_user_data = {'username': session.get('username'), 'role': session.get('role')}
    return jsonify({'currentUser': current_user_data, 'personnel': personnel_list})

@app.route('/api/tasks/<int:task_id>/comments/<int:comment_id>', methods=['PUT', 'DELETE'])
@login_required
def handle_single_comment(task_id, comment_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task or 'comments' not in task: return jsonify({'error': 'Görev veya yorumlar bulunamadı'}), 404
    comment_index, comment = next(((i, c) for i, c in enumerate(task['comments']) if c['comment_id'] == comment_id), (None, None))
    if not comment: return jsonify({'error': 'Yorum bulunamadı'}), 404
    is_author, is_admin = comment['author_username'] == session.get('username'), session.get('role') == 'admin'
    if not is_author and not is_admin: return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403
    if request.method == 'DELETE': task['comments'].pop(comment_index); write_json(TASKS_DB_PATH, tasks); return jsonify({'success': True}), 200
    if request.method == 'PUT':
        data = request.get_json()
        new_text = data.get('text')
        if not new_text: return jsonify({'error': 'Yorum metni boş olamaz'}), 400
        comment['text'] = new_text
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(comment), 200

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
        original_filename, stored_filename = secure_filename(file.filename), f"{int(time.time())}_{secure_filename(file.filename)}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], stored_filename))
        if 'files' not in task: task['files'] = []
        task['files'].append({'original_name': original_filename, 'stored_name': stored_filename})
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True, 'filename': original_filename}), 200

@app.route('/uploads/<filename>')
@login_required
def download_file(filename): return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

@app.route('/api/tasks/<int:task_id>/files/<stored_filename>', methods=['DELETE'])
@login_required
def delete_file_from_task(task_id, stored_filename):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task or 'files' not in task: return jsonify({'error': 'Görev veya dosyalar bulunamadı'}), 404
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
        if os.path.exists(file_path): os.remove(file_path)
        task['files'] = [f for f in task['files'] if f['stored_name'] != stored_filename]
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

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
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    if not os.path.exists('db'):
        os.makedirs('db')
    app.run(host='0.0.0.0', port=5000, debug=True)