const list = document.querySelector("#starred");
const status = document.querySelector("#status");
const search = document.querySelector("#search");

let repos = [];

function render() {
  const query = search.value.trim().toLowerCase();
  const matches = repos.filter((event) => event.name.toLowerCase().includes(query));

  list.replaceChildren();
  matches.forEach((event) => {
    const item = document.createElement("li");
    item.textContent = `${event.name} — starred ${event.starred}`;
    list.appendChild(item);
  });

  if (!repos.length) {
    status.textContent = "No starred repositories yet.";
  } else if (!query) {
    status.textContent = `${repos.length} starred repositories loaded.`;
  } else if (matches.length) {
    status.textContent = `Showing ${matches.length} of ${repos.length} repositories.`;
  } else {
    status.textContent = `No repositories match "${search.value.trim()}".`;
  }
}

if (list && status && search) {
  fetch("events.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((events) => {
      if (!Array.isArray(events)) {
        throw new Error("events.json is not a list");
      }
      repos = events.filter((event) => event && typeof event.name === "string" && event.starred);
      search.disabled = false;
      search.addEventListener("input", render);
      render();
    })
    .catch((error) => {
      status.textContent = `Could not load starred repositories (${error.message}).`;
      console.error(error);
    });
} else {
  console.error("script.js: #starred, #status or #search element is missing from the page.");
}
