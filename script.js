/* =========================================
   TaskFlow - Application Logic
   ========================================= */

// =========================================
// DOM Elements
// =========================================

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

const modalOverlay = document.getElementById("modalOverlay");
const openModalBtn = document.getElementById("openModalBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");

const taskTitleInput = document.getElementById("taskTitle");
const taskDescriptionInput = document.getElementById("taskDescription");
const taskPriorityInput = document.getElementById("taskPriority");
const taskDueDateInput = document.getElementById("taskDueDate");

const modalTitle = document.getElementById("modalTitle");
const submitButtonText = document.getElementById("submitButtonText");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const themeToggle = document.getElementById("themeToggle");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

const sectionTitle = document.getElementById("sectionTitle");
const sectionSubtitle = document.getElementById("sectionSubtitle");

const greeting = document.getElementById("greeting");

// =========================================
// Application State
// =========================================

let tasks = JSON.parse(localStorage.getItem("taskflow_tasks")) || [];

let currentFilter = "all";
let editingTaskId = null;
let toastTimeout;

// =========================================
// Initialization
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    setGreeting();
    renderTasks();
    updateStatistics();
});

// =========================================
// Utility Functions
// =========================================

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function saveTasks() {
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));
}

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;

    return task.dueDate < getTodayString();
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add("visible");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("visible");
    }, 3000);
}

function setGreeting() {
    const hour = new Date().getHours();

    let greetingText = "Good evening";

    if (hour < 12) {
        greetingText = "Good morning";
    } else if (hour < 18) {
        greetingText = "Good afternoon";
    }

    greeting.textContent = `${greetingText}, Gaurav`;
}

// =========================================
// Modal Functions
// =========================================

function openModal(task = null) {
    modalOverlay.classList.add("visible");

    if (task) {
        editingTaskId = task.id;

        modalTitle.textContent = "Edit Task";
        submitButtonText.textContent = "Save Changes";

        taskTitleInput.value = task.title;
        taskDescriptionInput.value = task.description || "";
        taskPriorityInput.value = task.priority;
        taskDueDateInput.value = task.dueDate || "";
    } else {
        editingTaskId = null;

        modalTitle.textContent = "Create New Task";
        submitButtonText.textContent = "Create Task";

        taskForm.reset();
        taskPriorityInput.value = "medium";
    }

    setTimeout(() => taskTitleInput.focus(), 100);
}

function closeModal() {
    modalOverlay.classList.remove("visible");
    taskForm.reset();
    editingTaskId = null;

    modalTitle.textContent = "Create New Task";
    submitButtonText.textContent = "Create Task";
}

openModalBtn.addEventListener("click", () => openModal());
emptyAddBtn.addEventListener("click", () => openModal());

closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalOverlay.classList.contains("visible")) {
        closeModal();
    }
});

// =========================================
// Create / Edit Task
// =========================================

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const priority = taskPriorityInput.value;
    const dueDate = taskDueDateInput.value;

    if (!title) {
        showToast("Please enter a task title.");
        return;
    }

    if (editingTaskId) {
        tasks = tasks.map((task) => {
            if (task.id === editingTaskId) {
                return {
                    ...task,
                    title,
                    description,
                    priority,
                    dueDate
                };
            }

            return task;
        });

        showToast("Task updated successfully!");
    } else {
        const newTask = {
            id: generateId(),
            title,
            description,
            priority,
            dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);

        showToast("Task created successfully!");
    }

    saveTasks();
    renderTasks();
    updateStatistics();
    closeModal();
});

// =========================================
// Task Actions
// =========================================

function toggleTask(taskId) {
    tasks = tasks.map((task) => {
        if (task.id === taskId) {
            return {
                ...task,
                completed: !task.completed
            };
        }

        return task;
    });

    saveTasks();
    renderTasks();
    updateStatistics();

    const task = tasks.find((item) => item.id === taskId);

    if (task.completed) {
        showToast("Task marked as completed!");
    } else {
        showToast("Task moved to pending!");
    }
}

function deleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) return;

    const confirmed = confirm(`Delete "${task.title}"?`);

    if (!confirmed) return;

    tasks = tasks.filter((task) => task.id !== taskId);

    saveTasks();
    renderTasks();
    updateStatistics();

    showToast("Task deleted successfully!");
}

function editTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);

    if (task) {
        openModal(task);
    }
}

// =========================================
// Filtering & Sorting
// =========================================

function getFilteredTasks() {
    let filteredTasks = [...tasks];

    // Filter by current section
    if (currentFilter === "completed") {
        filteredTasks = filteredTasks.filter((task) => task.completed);
    } else if (currentFilter === "pending") {
        filteredTasks = filteredTasks.filter((task) => !task.completed);
    } else if (currentFilter === "today") {
        filteredTasks = filteredTasks.filter(
            (task) => task.dueDate === getTodayString()
        );
    }

    // Search
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm) {
        filteredTasks = filteredTasks.filter((task) => {
            return (
                task.title.toLowerCase().includes(searchTerm) ||
                (task.description || "").toLowerCase().includes(searchTerm)
            );
        });
    }

    // Sort
    const sortValue = sortSelect.value;

    if (sortValue === "newest") {
        filteredTasks.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    } else if (sortValue === "oldest") {
        filteredTasks.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
    } else if (sortValue === "priority") {
        const priorityOrder = {
            high: 1,
            medium: 2,
            low: 3
        };

        filteredTasks.sort(
            (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
    } else if (sortValue === "dueDate") {
        filteredTasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            return a.dueDate.localeCompare(b.dueDate);
        });
    }

    return filteredTasks;
}

function setFilter(filter) {
    currentFilter = filter;

    // Update sidebar navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle(
            "active",
            item.dataset.filter === filter
        );
    });

    // Update filter tabs
    document.querySelectorAll(".filter-tab").forEach((item) => {
        const tabFilter = item.dataset.filter;

        item.classList.toggle(
            "active",
            tabFilter === filter ||
            (filter === "today" && tabFilter === "all")
        );
    });

    updateSectionHeading();
    renderTasks();
}

function updateSectionHeading() {
    const headings = {
        all: ["All Tasks", "Your complete task list"],
        today: ["Today's Tasks", "Tasks scheduled for today"],
        completed: ["Completed Tasks", "Your finished tasks"],
        pending: ["Pending Tasks", "Tasks waiting for completion"]
    };

    const heading = headings[currentFilter] || headings.all;

    sectionTitle.textContent = heading[0];
    sectionSubtitle.textContent = heading[1];
}

// Sidebar filters
document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
        setFilter(item.dataset.filter);
    });
});

// Tab filters
document.querySelectorAll(".filter-tab").forEach((item) => {
    item.addEventListener("click", () => {
        setFilter(item.dataset.filter);
    });
});

searchInput.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);

// =========================================
// Render Tasks
// =========================================

function renderTasks() {
    const filteredTasks = getFilteredTasks();

    taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
        emptyState.classList.add("visible");
    } else {
        emptyState.classList.remove("visible");

        filteredTasks.forEach((task) => {
            taskList.appendChild(createTaskElement(task));
        });
    }
}

function createTaskElement(task) {
    const card = document.createElement("div");

    card.className = `task-card ${task.completed ? "completed" : ""}`;

    const dueDateHTML = task.dueDate
        ? `<span class="due-date ${isOverdue(task) ? "overdue" : ""}">
                ${isOverdue(task) ? "Overdue" : formatDate(task.dueDate)}
           </span>`
        : "";

    card.innerHTML = `
        <button
            class="task-checkbox"
            aria-label="${task.completed ? "Mark as pending" : "Mark as completed"}"
            data-action="toggle"
            data-id="${task.id}">
        </button>

        <div class="task-content">
            <h3 class="task-title">${escapeHTML(task.title)}</h3>
            ${
                task.description
                    ? `<p class="task-description">${escapeHTML(task.description)}</p>`
                    : ""
            }
        </div>

        <div class="task-meta">
            <span class="priority-badge ${task.priority}">
                ${task.priority}
            </span>
            ${dueDateHTML}
        </div>

        <div class="task-actions">
            <button
                class="task-action"
                title="Edit task"
                data-action="edit"
                data-id="${task.id}">
                ✎
            </button>

            <button
                class="task-action delete"
                title="Delete task"
                data-action="delete"
                data-id="${task.id}">
                ×
            </button>
        </div>
    `;

    return card;
}

// Event delegation for task actions
taskList.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");

    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const taskId = actionElement.dataset.id;

    if (action === "toggle") {
        toggleTask(taskId);
    } else if (action === "edit") {
        editTask(taskId);
    } else if (action === "delete") {
        deleteTask(taskId);
    }
});

// =========================================
// Statistics
// =========================================

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;

    const today = tasks.filter(
        (task) => task.dueDate === getTodayString() && !task.completed
    ).length;

    const completionRate = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("completionRate").textContent = `${completionRate}%`;

    document.getElementById("allCount").textContent = total;
    document.getElementById("todayCount").textContent = today;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("pendingCount").textContent = pending;

    document.getElementById("productivityPercent").textContent =
        `${completionRate}%`;

    document.getElementById("progressFill").style.width =
        `${completionRate}%`;
}

// =========================================
// Theme Toggle
// =========================================

function loadTheme() {
    const savedTheme = localStorage.getItem("taskflow_theme");

    if (savedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        themeToggle.textContent = "☀";
    } else {
        document.documentElement.removeAttribute("data-theme");
        themeToggle.textContent = "☾";
    }
}

themeToggle.addEventListener("click", () => {
    const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

    if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("taskflow_theme", "light");
        themeToggle.textContent = "☾";
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("taskflow_theme", "dark");
        themeToggle.textContent = "☀";
    }
});
