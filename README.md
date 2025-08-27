---

# Syncra-Task - A Full-Stack Flask Project Management Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blueviolet.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.x-green.svg)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Syncra-Task is a comprehensive, full-stack project management and task tracking application built with Flask and vanilla JavaScript. It provides a clean, modern interface for teams to manage tasks, monitor progress, and analyze performance, with distinct roles and permissions for administrators and employees.

---

## ✨ Key Features

-   **Role-Based Access Control**:
    -   **Admin View**: Full control over task creation, assignment, user management, and performance analytics.
    -   **Employee View**: Can view and manage tasks assigned to them.
-   **Multiple Task Views**:
    -   **List View**: A traditional to-do list format.
    -   **Kanban Board**: A drag-and-drop interface to manage tasks across `To Do`, `In Progress`, and `Done` statuses.
    -   **Calendar View**: Visualize task deadlines and employee birthdays on a full-page calendar.
-   **Comprehensive Admin Dashboard**:
    -   At-a-glance statistics for total, completed, in-progress, and overdue tasks.
    -   A feed of recently created tasks.
-   **Personnel Management**:
    -   Admins can add, edit, and delete employee accounts.
    -   Detailed performance analytics for each employee, tracking completion rates, on-time delivery, and more.
-   **Rich Task Details**:
    -   Tasks include priority levels (High, Normal, Low), due dates, and descriptions.
    -   **Task Dependencies**: Block tasks from being started until other tasks are completed.
    -   **Commenting System**: Users can discuss tasks in a dedicated comment thread with @mentions.
    -   **File Attachments**: Upload and associate files with any task.
    -   **Activity Log**: Admins can view a complete history of changes for each task.
-   **Real-time Notifications**: A notification system alerts users to new task assignments and mentions.
-   **Advanced User Profiles**:
    -   Users can update their personal information, password, and profile picture.
    -   A sliding "Team Panel" shows all team members, with clickable profile cards displaying user details.
-   **Modern UI/UX**:
    -   Clean, responsive design.
    -   **Light/Dark Mode Theme**: Switch themes via the settings panel.
    -   Interactive elements like custom multi-select dropdowns and animated modals.

---

## 🛠️ Technology Stack

-   **Backend**:
    -   **Framework**: Flask (Python)
    -   **Database**: File-based JSON for simplicity and portability.
-   **Frontend**:
    -   **Templating**: Jinja2
    -   **JavaScript**: Vanilla JavaScript (ES6+), using `fetch` for API communication.
    -   **Styling**: Custom CSS3 with Flexbox and Grid.
    -   **Libraries**:
        -   [FullCalendar.js](https://fullcalendar.io/) for the calendar view.
        -   [Font Awesome](https://fontawesome.com/) for icons.
        -   [Canvas Confetti](https://github.com/catdad/canvas-confetti) for a fun effect on task completion.

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

-   Python 3.8 or higher
-   `pip` (Python package installer)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/Syncra-Task.git
    cd Syncra-Task
    ```

2.  **Create and activate a virtual environment:**
    -   On macOS/Linux:
        ```sh
        python3 -m venv venv
        source venv/bin/activate
        ```
    -   On Windows:
        ```sh
        python -m venv venv
        .\venv\Scripts\activate
        ```

3.  **Install the required packages:**
    *(You should create a `requirements.txt` file with `Flask` and `Werkzeug`)*
    ```sh
    pip install Flask Werkzeug
    ```

4.  **Initial User Setup:**
    -   The application will automatically create the necessary directories (`db`, `uploads`, `static/profile_pics`).
    -   To create the first admin user, create a file named `db/users.json` and add the following content. **Remember to change the password!**
    ```json
    [
        {
            "id": 1670000000000,
            "username": "admin",
            "password": "yoursecurepassword",
            "role": "admin",
            "full_name": "Administrator",
            "profile_picture": "default_avatar.png"
        }
    ]
    ```

5.  **Run the application:**
    ```sh
    python app.py
    ```
    The application will be available at `http://127.0.0.1:5000`.

---

##  Usage

-   Navigate to `http://127.0.0.1:5000` in your web browser.
-   Log in using the credentials you created in `db/users.json` (e.g., `admin` / `yoursecurepassword`).
-   As an admin, you can start by adding new employees in the "Personnel Management" section and creating new tasks in the "List View".

---

## 📂 Project Structure

```
Syncra-Task/
├── db/
│   ├── users.json
│   ├── tasks.json
│   └── notifications.json
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── dashboard-script.js
│   │   └── ... (other JS files)
│   └── profile_pics/
│       └── default_avatar.png
├── templates/
│   ├── _settings_modal.html
│   ├── dashboard.html
│   └── ... (other HTML files)
├── uploads/
│   └── (Uploaded files for tasks will be stored here)
├── app.py                  # Main Flask application file
└── README.md               # This file
```

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---