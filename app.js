let config;
let tasksUrl;
let tasks = [];
let editingId = null;

const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const submitButton = document.querySelector("#task-submit");
const taskList = document.querySelector("#task-list");
const statusMessage = document.querySelector("#status-message");

function showStatus(message) {
  statusMessage.textContent = message;
}

async function apiRequest(url, method = "GET", body) {
  const headers = {
    apikey: config.supabasePublishableKey,
    Authorization: `Bearer ${config.supabasePublishableKey}`
  };

  const options = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  let result = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.details ||
      (typeof result === "string" ? result : "") ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return result;
}

async function loadTasks() {
  showStatus("Loading tasks…");

  try {
    tasks = await apiRequest(`${tasksUrl}?select=*`);
    renderTasks();
    showStatus("");
  } catch (error) {
    showStatus(`Could not load tasks: ${error.message}`);
  }
}

function renderTasks() {
  taskList.replaceChildren();

  for (const task of tasks) {
    const item = document.createElement("article");
    item.className = "task-item";
    item.dataset.id = task.id;

    const title = document.createElement("h2");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "No description";

    const status = document.createElement("p");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Incomplete";

    const editButton = document.createElement("button");
    editButton.className = "edit-task";
    editButton.type = "button";
    editButton.textContent = "Edit";

    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-task";
    toggleButton.type = "button";
    toggleButton.textContent = task.completed
      ? "Mark incomplete"
      : "Mark complete";

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    item.append(
      title,
      description,
      status,
      editButton,
      toggleButton,
      deleteButton
    );

    taskList.append(item);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!tasksUrl) {
    showStatus("The app is still connecting to Supabase. Please try again.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    showStatus("Please enter a task title.");
    titleInput.focus();
    return;
  }

  try {
    if (editingId === null) {
      await apiRequest(tasksUrl, "POST", {
        title,
        description,
        completed: false
      });
      showStatus("Task added.");
    } else {
      await apiRequest(
        `${tasksUrl}?id=eq.${encodeURIComponent(editingId)}`,
        "PATCH",
        { title, description }
      );
      editingId = null;
      submitButton.textContent = "Add task";
      showStatus("Task updated.");
    }

    form.reset();
    await loadTasks();
  } catch (error) {
    showStatus(`Could not save task: ${error.message}`);
  }
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const item = button.closest(".task-item");
  if (!item) return;

  const task = tasks.find((entry) => String(entry.id) === item.dataset.id);
  if (!task) return;

  if (button.classList.contains("edit-task")) {
    editingId = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description || "";
    submitButton.textContent = "Save changes";
    showStatus("Edit the task, then choose Save changes.");
    titleInput.focus();
    return;
  }

  try {
    if (button.classList.contains("toggle-task")) {
      await apiRequest(
        `${tasksUrl}?id=eq.${encodeURIComponent(task.id)}`,
        "PATCH",
        { completed: !task.completed }
      );
      showStatus("Task status updated.");
    } else if (button.classList.contains("delete-task")) {
      await apiRequest(
        `${tasksUrl}?id=eq.${encodeURIComponent(task.id)}`,
        "DELETE"
      );
      showStatus("Task deleted.");
    }

    await loadTasks();
  } catch (error) {
    showStatus(`Could not update task: ${error.message}`);
  }
});

async function startApp() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) {
      throw new Error("Could not load config.json.");
    }

    config = await response.json();

    if (
      !config.supabaseUrl ||
      !config.supabasePublishableKey ||
      config.tableName !== "tasks"
    ) {
      throw new Error("Check the values in config.json.");
    }

    tasksUrl = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/${config.tableName}`;
    await loadTasks();
  } catch (error) {
    showStatus(`App setup error: ${error.message}`);
  }
}

startApp();
