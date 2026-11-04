let config;
let tasksUrl;

async function loadConfig() {
  const response = await fetch("config.json");

  if (!response.ok) {
    throw new Error("Could not load config.json");
  }

  config = await response.json();

  if (!config.supabaseUrl || !config.supabasePublishableKey || config.tableName !== "tasks") {
    throw new Error("Check the values in config.json");
  }

  tasksUrl = `${config.supabaseUrl}/rest/v1/${config.tableName}`;
}

loadConfig().catch((error) => {
  document.querySelector("#status-message").textContent = error.message;
});
