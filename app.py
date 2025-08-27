import json
import time
import os
import re
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
PROFILE_PIC_FOLDER = 'static/profile_pics'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROFILE_PIC_FOLDER'] = PROFILE_PIC_FOLDER


def read_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return []
def write_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f: json.dump(data, f, indent=4, ensure_ascii=False)

def log_activity(task, username, action):
    if 'activity_log' not in task:
        task['activity_log'] = []
    log_entry = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'user': username,
        'action': action
    }
    task['activity_log'].append(log_entry)

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
    return render_template('dashboard.html', profile_picture=session.get('profile_picture'))

@app.route('/yonetici')
@login_required
def yonetici_paneli():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('yonetici.html', profile_picture=session.get('profile_picture'))

@app.route('/personel')
@login_required
def personel_paneli():
    if session.get('role') != 'employee': return redirect(url_for('yonetici_paneli'))
    return render_template('personel.html', profile_picture=session.get('profile_picture'))

@app.route('/kanban')
@login_required
def kanban_panosu():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('kanban.html', profile_picture=session.get('profile_picture'))

@app.route('/personel-kanban')
@login_required
def personel_kanban_sayfasi():
    if session.get('role') != 'employee': return redirect(url_for('yonetici_paneli'))
    return render_template('personel-kanban.html', profile_picture=session.get('profile_picture'))

@app.route('/personel-yonetimi')
@login_required
def personel_yonetimi_sayfasi():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('personel-yonetimi.html', profile_picture=session.get('profile_picture'))

@app.route('/personnel-performance')
@login_required
def personnel_performance_page():
    if session.get('role') != 'admin': return redirect(url_for('personel_paneli'))
    return render_template('personnel-performance.html', profile_picture=session.get('profile_picture'))

@app.route('/takvim')
@login_required
def takvim_sayfasi():
    return render_template('takvim.html', profile_picture=session.get('profile_picture'))

# --- API Rotaları ---
@app.route('/api/team-members')
@login_required
def get_team_members():
    users = read_json(USERS_DB_PATH)
    admins = sorted([u for u in users if u.get('role') == 'admin'], key=lambda x: x.get('full_name', x.get('username')))
    employees = sorted([u for u in users if u.get('role') == 'employee'], key=lambda x: x.get('full_name', x.get('username')))
    team_list = admins + employees
    team_data = [{'id': user['id'], 'full_name': user.get('full_name', user['username']), 'profile_picture': user.get('profile_picture', 'default_avatar.png')} for user in team_list]
    return jsonify(team_data)

@app.route('/api/user-profile/<int:user_id>')
@login_required
def get_user_profile(user_id):
    users = read_json(USERS_DB_PATH)
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
    profile_data = {
        'full_name': user.get('full_name', user['username']), 'profile_picture': user.get('profile_picture', 'default_avatar.png'),
        'email': user.get('email', 'Belirtilmemiş'), 'phone_number': user.get('phone_number', 'Belirtilmemiş'),
        'birthday': user.get('birthday', 'Belirtilmemiş')
    }
    return jsonify(profile_data)

@app.route('/api/calendar-tasks')
@login_required
def get_calendar_tasks():
    all_tasks = read_json(TASKS_DB_PATH)
    users = read_json(USERS_DB_PATH)
    calendar_events = []
    tasks_to_show = []
    if session.get('role') == 'admin':
        tasks_to_show = all_tasks
    else:
        user_id = session.get('user_id')
        tasks_to_show = [t for t in all_tasks if user_id in t.get('assignedTo', [])]
    for task in tasks_to_show:
        if task.get('dueDate'):
            color = '#3498db'
            if task.get('priority') == 'high': color = '#e74c3c'
            elif task.get('priority') == 'low': color = '#f1c40f'
            if task.get('completed'): color = '#95a5a6'
            calendar_events.append({
                'id': task.get('id'), 'title': task.get('text'), 'start': task.get('dueDate'),
                'color': color, 'allDay': True
            })
    current_year = datetime.now().year
    for user in users:
        if user.get('birthday'):
            try:
                birth_date = datetime.strptime(user['birthday'], '%Y-%m-%d')
                event_date_this_year = birth_date.replace(year=current_year)
                calendar_events.append({
                    'id': f"birthday-{user['id']}", 'title': f"🎉 {user.get('full_name', user['username'])} Mutlu Yıllar!!",
                    'start': event_date_this_year.strftime('%Y-%m-%d'), 'allDay': True,
                    'color': '#2ecc71', 'editable': False
                })
            except (ValueError, TypeError): continue
    return jsonify(calendar_events)
    
@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def handle_tasks():
    if request.method == 'POST':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        new_task_data = request.get_json()
        timestamp = datetime.utcnow().isoformat() + 'Z'
        new_task_data.update({
            'status': 'todo', 'id': int(time.time() * 1000), 'description': new_task_data.get('description', ''),
            'comments': [], 'files': [], 'creationDate': timestamp, 'completionDate': None,
            'depends_on': new_task_data.get('depends_on', [])
        })
        if 'assignedTo' not in new_task_data or not isinstance(new_task_data['assignedTo'], list):
            return jsonify({'error': 'Atanan personel bir liste formatında olmalı'}), 400
        log_activity(new_task_data, session.get('username'), "görevi oluşturdu.")
        tasks = read_json(TASKS_DB_PATH)
        tasks.append(new_task_data)
        write_json(TASKS_DB_PATH, tasks)
        assigned_user_ids = new_task_data.get('assignedTo', [])
        if assigned_user_ids:
            notifications = read_json(NOTIFICATIONS_DB_PATH)
            for user_id in assigned_user_ids:
                new_notification = {
                    'id': int(time.time() * 1000) + user_id, 'user_id': user_id, 'task_id': new_task_data.get('id'),
                    'message': f"Size yeni bir görev atandı: '{new_task_data.get('text')}'", 'read': False,
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
                notifications.append(new_notification)
            write_json(NOTIFICATIONS_DB_PATH, notifications)
        return jsonify(new_task_data), 201
    tasks = read_json(TASKS_DB_PATH)
    users = read_json(USERS_DB_PATH)
    user_map = {
        user['id']: {
            'username': user['username'],
            'full_name': user.get('full_name', user['username']),
            'profile_picture': user.get('profile_picture', 'default_avatar.png')
        } for user in users
    }
    
    task_map = {task['id']: task for task in tasks}

    for task in tasks:
        assigned_ids = task.get('assignedTo', [])
        task['assignedToUsers'] = [user_map.get(user_id) for user_id in assigned_ids if user_id in user_map]
        task['assignedToUsernames'] = [user['username'] for user in task['assignedToUsers']]

        task['is_blocked'] = False
        dependencies = task.get('depends_on', [])
        if dependencies:
            for dep_id in dependencies:
                if dep_id in task_map and not task_map[dep_id].get('completed'):
                    task['is_blocked'] = True
                    break
    if session['role'] == 'admin': return jsonify(tasks)
    
    user_id = session.get('user_id')
    user_tasks = [t for t in tasks if user_id in t.get('assignedTo', [])]
    return jsonify(user_tasks)

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def handle_single_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    users = read_json(USERS_DB_PATH)
    user_map = {user['id']: user['username'] for user in users}
    task_index, task = next(((i, t) for i, t in enumerate(tasks) if t['id'] == task_id), (None, None))
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404

    if request.method == 'PUT':
        updates = request.get_json()
        current_user = session.get('username')
        if 'assignedTo' in updates and updates['assignedTo'] != task.get('assignedTo'):
            old_users = ", ".join([user_map.get(uid, '?') for uid in task.get('assignedTo', [])])
            new_users = ", ".join([user_map.get(uid, '?') for uid in updates.get('assignedTo', [])])
            log_activity(task, current_user, f"görevi '{old_users}' kişisinden '{new_users}' kişisine atadı.")
        if updates.get('completed') and not task.get('completed'):
            task['completionDate'] = datetime.utcnow().isoformat() + 'Z'
            log_activity(task, current_user, "görevi tamamladı.")
        user_id = session.get('user_id')
        is_owner = user_id in task.get('assignedTo', [])
        if session.get('role') == 'admin': task.update(updates)
        elif is_owner:
            allowed_updates = {k: v for k, v in updates.items() if k in ['status', 'completed', 'description']}
            task.update(allowed_updates)
        else: return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(task), 200

    if request.method == 'GET':
        assigned_ids = task.get('assignedTo', [])
        task['assignedToUsernames'] = [user_map.get(user_id, 'Bilinmiyor') for user_id in assigned_ids]
        if 'comments' in task:
            for comment in task['comments']:
                comment['can_edit'] = (comment['author_username'] == session.get('username') or session.get('role') == 'admin')
        if session.get('role') != 'admin':
            if 'activity_log' in task: del task['activity_log']
        return jsonify(task)

    if request.method == 'DELETE':
        if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
        tasks.pop(task_index)
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True}), 200

@app.route('/api/profile', methods=['GET', 'PUT'])
@login_required
def handle_profile():
    users = read_json(USERS_DB_PATH)
    user_id = session.get('user_id')
    user_index, current_user = next(((i, u) for i, u in enumerate(users) if u['id'] == user_id), (None, None))
    if current_user is None: return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

    if request.method == 'GET':
        profile_data = current_user.copy()
        del profile_data['password']
        return jsonify(profile_data)

    if request.method == 'PUT':
        new_username = request.form.get('username')
        new_full_name = request.form.get('full_name')
        new_email = request.form.get('email')
        new_phone_number = request.form.get('phone_number')
        new_birthday = request.form.get('birthday')
        old_password = request.form.get('old_password')
        new_password = request.form.get('new_password')

        if new_username and new_username != current_user['username']:
            if any(u['username'] == new_username for u in users):
                return jsonify({'error': 'Bu kullanıcı adı zaten alınmış.'}), 409
            current_user['username'] = new_username
            session['username'] = new_username

        if old_password and new_password:
            if old_password == current_user['password']: current_user['password'] = new_password
            else: return jsonify({'error': 'Eski şifreniz yanlış.'}), 400
        elif new_password and not old_password:
             return jsonify({'error': 'Yeni şifre belirlemek için eski şifrenizi girmelisiniz.'}), 400

        current_user['full_name'] = new_full_name if new_full_name else current_user.get('full_name')
        current_user['email'] = new_email if new_email else current_user.get('email')
        current_user['phone_number'] = new_phone_number if new_phone_number else current_user.get('phone_number')
        
        if new_birthday: current_user['birthday'] = new_birthday
        else: current_user.pop('birthday', None)

        if 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file.filename != '':
                if current_user.get('profile_picture') and current_user['profile_picture'] != 'default_avatar.png':
                    old_pic_path = os.path.join(app.config['PROFILE_PIC_FOLDER'], current_user['profile_picture'])
                    if os.path.exists(old_pic_path): os.remove(old_pic_path)
                filename = f"user_{user_id}_{secure_filename(file.filename)}"
                file.save(os.path.join(app.config['PROFILE_PIC_FOLDER'], filename))
                current_user['profile_picture'] = filename
                session['profile_picture'] = filename

        users[user_index] = current_user
        write_json(USERS_DB_PATH, users)
        return jsonify({'success': True, 'message': 'Profil başarıyla güncellendi.', 'new_data': {'username': session['username'], 'profile_picture': session['profile_picture']}})

@app.route('/api/profile/picture', methods=['DELETE'])
@login_required
def delete_profile_picture():
    users = read_json(USERS_DB_PATH)
    user_id = session.get('user_id')
    user_index, current_user = next(((i, u) for i, u in enumerate(users) if u['id'] == user_id), (None, None))
    if current_user is None:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
    current_pic = current_user.get('profile_picture')
    if current_pic and current_pic != 'default_avatar.png':
        pic_path = os.path.join(app.config['PROFILE_PIC_FOLDER'], current_pic)
        if os.path.exists(pic_path):
            os.remove(pic_path)
    current_user['profile_picture'] = 'default_avatar.png'
    users[user_index] = current_user
    write_json(USERS_DB_PATH, users)
    session['profile_picture'] = 'default_avatar.png'
    session.modified = True
    return jsonify({'success': True, 'message': 'Profil fotoğrafı silindi.', 'new_picture': 'default_avatar.png'})
@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@login_required
def add_comment_to_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404
    data = request.get_json()
    comment_text = data.get('text')
    if not comment_text: return jsonify({'error': 'Yorum metni boş olamaz'}), 400
    new_comment = { 'comment_id': int(time.time() * 1000), 'author_username': session.get('username'), 'text': comment_text, 'timestamp': datetime.utcnow().isoformat() + 'Z' }
    if 'comments' not in task: task['comments'] = []
    task['comments'].append(new_comment)
    log_activity(task, session.get('username'), "yeni bir yorum ekledi.")
    notifications = read_json(NOTIFICATIONS_DB_PATH)
    users = read_json(USERS_DB_PATH)
    user_map_by_name = {u['username'].lower(): u['id'] for u in users}
    mentioned_usernames = set(re.findall(r'@(\w+)', comment_text))
    commenter_id = session.get('user_id')
    for username in mentioned_usernames:
        user_id_to_notify = user_map_by_name.get(username.lower())
        if user_id_to_notify and user_id_to_notify != commenter_id:
            mention_notification = {
                'id': int(time.time() * 1000) + user_id_to_notify, 'user_id': user_id_to_notify, 'task_id': task_id,
                'message': f"'{session.get('username')}' sizi '{task.get('text')}' görevindeki bir yorumda etiketledi.",
                'read': False, 'timestamp': new_comment.get('timestamp')
            }
            notifications.append(mention_notification)
    write_json(NOTIFICATIONS_DB_PATH, notifications)
    write_json(TASKS_DB_PATH, tasks)
    return jsonify(new_comment), 201
@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    notifications = read_json(NOTIFICATIONS_DB_PATH)
    user_id = session.get('user_id')
    unread_notifications = [n for n in notifications if n.get('user_id') == user_id and not n.get('read')]
    return jsonify(sorted(unread_notifications, key=lambda x: x['timestamp'], reverse=True))
@app.route('/api/notifications/mark-as-read', methods=['POST'])
@login_required
def mark_notifications_as_read():
    notifications = read_json(NOTIFICATIONS_DB_PATH)
    user_id = session.get('user_id')
    for notification in notifications:
        if notification.get('user_id') == user_id and not notification.get('read'):
            notification['read'] = True
    write_json(NOTIFICATIONS_DB_PATH, notifications)
    return jsonify({'success': True})
@app.route('/api/personnel-stats/<int:user_id>')
@login_required
def get_personnel_stats(user_id):
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    all_tasks = read_json(TASKS_DB_PATH)
    personnel_tasks = [t for t in all_tasks if user_id in t.get('assignedTo', [])]
    if not personnel_tasks: return jsonify({'total_assigned': 0, 'completed_count': 0, 'completion_rate': 0, 'on_time_count': 0, 'on_time_rate': 0, 'overdue_count': 0, 'in_progress_count': 0, 'todo_count': 0, 'recent_activity': []})
    total_assigned, completed_count, on_time_count, overdue_count, in_progress_count = len(personnel_tasks), 0, 0, 0, 0
    today = date.today()
    for task in personnel_tasks:
        if task.get('completed'):
            completed_count += 1
            if task.get('dueDate') and task.get('completionDate'):
                due_date_obj = datetime.strptime(task['dueDate'], '%Y-%m-%d').date()
                completion_date_obj = datetime.fromisoformat(task['completionDate'].replace('Z', '')).date()
                if completion_date_obj <= due_date_obj: on_time_count += 1
        if not task.get('completed') and task.get('dueDate'):
             if datetime.strptime(task['dueDate'], '%Y-%m-%d').date() < today: overdue_count += 1
        if task.get('status') == 'inprogress': in_progress_count += 1
    stats = {
        'total_assigned': total_assigned, 'completed_count': completed_count,
        'completion_rate': round((completed_count / total_assigned) * 100) if total_assigned > 0 else 0,
        'on_time_count': on_time_count,
        'on_time_rate': round((on_time_count / completed_count) * 100) if completed_count > 0 else 0,
        'overdue_count': overdue_count, 'in_progress_count': in_progress_count,
        'recent_activity': sorted(personnel_tasks, key=lambda t: t.get('creationDate', ''), reverse=True)[:5]
    }
    return jsonify(stats)
@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    users = read_json(USERS_DB_PATH)
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)
    if user: 
        session.update(
            user_id=user['id'], username=user['username'], role=user['role'],
            profile_picture=user.get('profile_picture', 'default_avatar.png')
        )
        redirect_url = '/dashboard' if user['role'] == 'admin' else '/personel'
        return jsonify({'success': True, 'redirect_url': redirect_url})
    return jsonify({'success': False, 'message': 'Kullanıcı adı veya şifre hatalı'}), 401
@app.route('/api/dashboard-stats')
@login_required
def get_dashboard_stats():
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    tasks, users = read_json(TASKS_DB_PATH), read_json(USERS_DB_PATH)
    user_map = {user['id']: user['username'] for user in users}
    total_tasks, completed_tasks, in_progress_tasks, overdue_tasks = len(tasks), 0, 0, 0
    today = date.today()
    for task in tasks:
        if task.get('completed') or task.get('status') == 'done': completed_tasks += 1
        elif task.get('status') == 'inprogress': in_progress_tasks += 1
        if not task.get('completed') and task.get('dueDate'):
            try:
                if datetime.strptime(task['dueDate'], '%Y-%m-%d').date() < today: overdue_tasks += 1
            except ValueError: continue
    recent_tasks = sorted(tasks, key=lambda t: t.get('id', 0), reverse=True)[:5]
    for task in recent_tasks: 
        assigned_ids = task.get('assignedTo', [])
        task['assignedToUsername'] = ", ".join([user_map.get(uid, '?') for uid in assigned_ids])
    stats = {'total_tasks': total_tasks, 'completed_tasks': completed_tasks, 'in_progress_tasks': in_progress_tasks, 'overdue_tasks': overdue_tasks, 'recent_tasks': recent_tasks}
    return jsonify(stats)
@app.route('/api/logout', methods=['POST'])
def logout_api(): 
    session.clear()
    return jsonify({'success': True})
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
    if request.method == 'DELETE': 
        task['comments'].pop(comment_index)
        write_json(TASKS_DB_PATH, tasks)
        return jsonify({'success': True})
    if request.method == 'PUT':
        new_text = request.get_json().get('text')
        if not new_text: return jsonify({'error': 'Yorum metni boş olamaz'}), 400
        comment['text'] = new_text
        write_json(TASKS_DB_PATH, tasks)
        return jsonify(comment)
@app.route('/api/tasks/<int:task_id>/upload', methods=['POST'])
@login_required
def upload_file_to_task(task_id):
    tasks = read_json(TASKS_DB_PATH)
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task is None: return jsonify({'error': 'Görev bulunamadı'}), 404
    if 'file' not in request.files or request.files['file'].filename == '': return jsonify({'error': 'Dosya seçilmedi'}), 400
    file = request.files['file']
    stored_filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], stored_filename))
    if 'files' not in task: task['files'] = []
    task['files'].append({'original_name': file.filename, 'stored_name': stored_filename})
    write_json(TASKS_DB_PATH, tasks)
    return jsonify({'success': True, 'filename': file.filename})
@app.route('/uploads/<filename>')
@login_required
def download_file(filename): 
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
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
        return jsonify({'success': True})
    except Exception as e: return jsonify({'error': str(e)}), 500
@app.route('/api/personnel', methods=['GET', 'POST'])
@login_required
def handle_personnel():
    if session.get('role') != 'admin': return jsonify({'error': 'Yetkiniz yok'}), 403
    users = read_json(USERS_DB_PATH)
    if request.method == 'GET':
        return jsonify([{'id': u['id'], 'username': u['username']} for u in users if u['role'] == 'employee'])
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
    if not user_to_modify: return jsonify({'error': 'Personel bulunamadı'}), 404
    if request.method == 'DELETE':
        write_json(USERS_DB_PATH, [u for u in users if u['id'] != user_id])
        return jsonify({'success': True, 'message': 'Personel silindi'})
    if request.method == 'PUT':
        updates = request.get_json()
        new_username = updates.get('username')
        if new_username and any(u['username'] == new_username and u['id'] != user_id for u in users):
            return jsonify({'message': 'Bu kullanıcı adı zaten alınmış'}), 409
        if new_username: user_to_modify['username'] = new_username
        if updates.get('password'): user_to_modify['password'] = updates.get('password')
        write_json(USERS_DB_PATH, users)
        return jsonify({'message': 'Personel güncellendi', 'user': user_to_modify})

if __name__ == '__main__':
    for folder in [UPLOAD_FOLDER, PROFILE_PIC_FOLDER, 'db']:
        if not os.path.exists(folder):
            os.makedirs(folder)
    app.run(host='0.0.0.0', port=5000, debug=True)