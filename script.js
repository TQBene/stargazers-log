const list = document.querySelector("#starred");
const status = document.querySelector("#status");
const search = document.querySelector("#search");
const languageSelect = document.querySelector("#language");

const STATUS_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 10000;
const NO_LANGUAGE = "No language";

let repos = [];
let statusTimer;

function repositories(count) {
  return count === 1 ? "repository" : "repositories";
}

// Sort by language (repositories without one go last), then by name.
function byLanguageThenName(a, b) {
  if (a.language !== b.language) {
    if (a.language === NO_LANGUAGE) return 1;
    if (b.language === NO_LANGUAGE) return -1;
    return a.language.localeCompare(b.language);
  }
  return a.name.localeCompare(b.name);
}

function fillLanguageOptions() {
  const languages = [...new Set(repos.map((repo) => repo.language))];
  languages
    .sort((a, b) => byLanguageThenName({ language: a, name: "" }, { language: b, name: "" }))
    .forEach((language) => {
      const count = repos.filter((repo) => repo.language === language).length;
      const option = document.createElement("option");
      option.value = language;
      option.textContent = `${language} (${count})`;
      languageSelect.appendChild(option);
    });
}

function statusText(query, language, matchCount) {
  if (!repos.length) {
    return "No starred repositories yet.";
  }
  if (!query && !language) {
    return `${repos.length} starred ${repositories(repos.length)} loaded.`;
  }
  if (matchCount) {
    return `Showing ${matchCount} of ${repos.length} ${repositories(repos.length)}.`;
  }
  const filters = [];
  if (query) filters.push(`"${search.value.trim()}"`);
  if (language) filters.push(`language ${language}`);
  return `No repositories match ${filters.join(" and ")}.`;
}

function render({ announceNow = false } = {}) {
  const query = search.value.trim().toLowerCase();
  const language = languageSelect.value;
  const matches = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(query) && (!language || repo.language === language)
  );

  list.replaceChildren();
  matches.forEach((repo) => {
    const item = document.createElement("li");
    item.textContent = `${repo.name} — ${repo.language} — starred ${repo.starred}`;
    list.appendChild(item);
  });

  // Update the live region only once typing pauses, so screen readers
  // announce the result instead of every keystroke.
  clearTimeout(statusTimer);
  const text = statusText(query, language, matches.length);
  if (announceNow) {
    status.textContent = text;
  } else {
    statusTimer = setTimeout(() => {
      status.textContent = text;
    }, STATUS_DELAY_MS);
  }
}

if (list && status && search && languageSelect) {
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
      repos = events
        .filter(
          (event) => event && typeof event.name === "string" && typeof event.starred === "string"
        )
        .map((event) => ({
          name: event.name,
          starred: event.starred,
          language:
            typeof event.language === "string" && event.language.trim()
              ? event.language.trim()
              : NO_LANGUAGE,
        }))
        .sort(byLanguageThenName);

      fillLanguageOptions();
      search.disabled = false;
      languageSelect.disabled = false;
      search.addEventListener("input", () => render());
      // A dropdown choice is a single deliberate action, so announce it right away.
      languageSelect.addEventListener("change", () => render({ announceNow: true }));
      render({ announceNow: true });
    })
    .catch((error) => {
      const reason = error.name === "TimeoutError" ? "the request timed out" : error.message;
      status.textContent = `Could not load starred repositories (${reason}).`;
      console.error(error);
    });
} else {
  console.error(
    "script.js: #starred, #status, #search or #language element is missing from the page."
  );
}
