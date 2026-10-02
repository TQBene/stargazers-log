const list = document.querySelector("#starred");
const status = document.querySelector("#status");
const search = document.querySelector("#search");

const STATUS_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 10000;

let repos = [];
let statusTimer;

function repositories(count) {
  return count === 1 ? "repository" : "repositories";
}

function statusText(query, matchCount) {
  if (!repos.length) {
    return "No starred repositories yet.";
  }
  if (!query) {
    return `${repos.length} starred ${repositories(repos.length)} loaded.`;
  }
  if (matchCount) {
    return `Showing ${matchCount} of ${repos.length} ${repositories(repos.length)}.`;
  }
  return `No repositories match "${search.value.trim()}".`;
}

function render({ announceNow = false } = {}) {
  const query = search.value.trim().toLowerCase();
  const matches = repos.filter((event) => event.name.toLowerCase().includes(query));

  list.replaceChildren();
  matches.forEach((event) => {
    const item = document.createElement("li");
    item.textContent = `${event.name} — starred ${event.starred}`;
    list.appendChild(item);
  });

  // Update the live region only once typing pauses, so screen readers
  // announce the result instead of every keystroke.
  clearTimeout(statusTimer);
  const text = statusText(query, matches.length);
  if (announceNow) {
    status.textContent = text;
  } else {
    statusTimer = setTimeout(() => {
      status.textContent = text;
    }, STATUS_DELAY_MS);
  }
}

if (list && status && search) {
  fetch("events.json", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
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
      repos = events.filter(
        (event) => event && typeof event.name === "string" && typeof event.starred === "string"
      );
      search.disabled = false;
      search.addEventListener("input", () => render());
      render({ announceNow: true });
    })
    .catch((error) => {
      const reason = error.name === "TimeoutError" ? "the request timed out" : error.message;
      status.textContent = `Could not load starred repositories (${reason}).`;
      console.error(error);
    });
} else {
  console.error("script.js: #starred, #status or #search element is missing from the page.");
}
