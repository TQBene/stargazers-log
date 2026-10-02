const list = document.querySelector("#starred");
const status = document.querySelector("#status");

if (list && status) {
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
      const valid = events.filter((event) => event && event.name && event.starred);
      valid.forEach((event) => {
        const item = document.createElement("li");
        item.textContent = `${event.name} — starred ${event.starred}`;
        list.appendChild(item);
      });
      status.textContent = valid.length
        ? `${valid.length} starred repositories loaded.`
        : "No starred repositories yet.";
    })
    .catch((error) => {
      status.textContent = `Could not load starred repositories (${error.message}).`;
      console.error(error);
    });
} else {
  console.error("script.js: #starred or #status element is missing from the page.");
}
