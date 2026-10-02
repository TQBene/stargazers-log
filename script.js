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
      // "Python, 2 repositories" rather than "Python (2)", which screen readers read as "Python 2".
      option.textContent = `${language}, ${count} ${repositories(count)}`;
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
  let scope = "repositories";
  if (language === NO_LANGUAGE) {
    scope = "repositories without a language";
  } else if (language) {
    scope = `${language} repositories`;
  }
  return query ? `No ${scope} match "${search.value.trim()}".` : `No ${scope} found.`;
}

// Use one spelling per language, so "Python" and "python" end up in the same group.
function normalizeLanguages(items) {
  const spellings = new Map();
  return items.map((item) => {
    const key = item.language.toLowerCase();
    if (!spellings.has(key)) {
      spellings.set(key, item.language);
    }
    return { ...item, language: spellings.get(key) };
  });
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
      const valid = events.filter(
        (event) => event && typeof event.name === "string" && typeof event.starred === "string"
      );
      if (valid.length < events.length) {
        console.warn(
          `events.json: skipped ${events.length - valid.length} entries without a text "name" and "starred" field.`
        );
      }
      repos = normalizeLanguages(
        valid.map((event) => ({
          name: event.name,
          starred: event.starred,
          language:
            typeof event.language === "string" && event.language.trim()
              ? event.language.trim()
              : NO_LANGUAGE,
        }))
      ).sort(byLanguageThenName);

      fillLanguageOptions();
      search.disabled = false;
      languageSelect.disabled = false;
      search.addEventListener("input", () => render());
      // Arrow keys on a closed dropdown fire "change" for every option in Chrome and
      // Edge on Windows, so the status waits for a pause here too.
      languageSelect.addEventListener("change", () => render());
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
