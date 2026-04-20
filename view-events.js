(function () {
    const API_URL = "api/events.php";

    // Search and results elements come from the view events page.
    const searchInput = document.getElementById("search-input");

    const eventsGrid = document.getElementById("events-grid");
    const emptyState = document.getElementById("empty-state");
    const resultsCount = document.getElementById("results-count");

    if (!eventsGrid) {
        return;
    }

    let allEvents = [];

    // Small helper so every API call handles errors in one place.
    async function requestJson(url, options) {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json"
            },
            ...options
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }

        if (!response.ok) {
            throw new Error(payload && payload.error ? payload.error : "Request failed.");
        }

        return payload;
    }

    function toDisplayDate(dateValue) {
        // Convert YYYY-MM-DD into a friendlier DD/MM/YYYY format.
        if (!dateValue) {
            return "Unknown date";
        }
        const parts = dateValue.split("-");
        if (parts.length !== 3) {
            return dateValue;
        }
        return [parts[2], parts[1], parts[0]].join("/");
    }

    function getFilteredEvents() {
        const searchTerm = (searchInput ? searchInput.value : "").trim().toLowerCase();

        // Search matches across the main text fields shown to users.
        return allEvents.filter(function (event) {
            const haystack = [event.name, event.location, event.description, event.category].join(" ").toLowerCase();
            return !searchTerm || haystack.includes(searchTerm);
        });
    }

    // Build each card with DOM methods to avoid unsafe HTML injection.
    function createEventCard(event) {
        const card = document.createElement("div");
        card.className = "event-card";

        const imageWrap = document.createElement("div");
        imageWrap.className = "event-image";
        if (event.image_path) {
            const image = document.createElement("img");
            image.src = event.image_path;
            image.alt = event.name;
            imageWrap.appendChild(image);
        } else {
            const noImage = document.createElement("span");
            noImage.textContent = "No image";
            imageWrap.appendChild(noImage);
        }

        const details = document.createElement("div");
        details.className = "event-details";

        const title = document.createElement("div");
        title.className = "event-name";
        title.textContent = event.name;

        const dateInfo = document.createElement("div");
        dateInfo.className = "event-info";
        dateInfo.textContent = "Date: " + toDisplayDate(event.date) + " - " + (event.time || "--:--");

        const locationInfo = document.createElement("div");
        locationInfo.className = "event-info";
        locationInfo.textContent = "Location: " + event.location;

        const description = document.createElement("div");
        description.className = "event-description";
        description.textContent = event.description;

        const category = document.createElement("span");
        category.className = "event-category";
        category.textContent = event.category;

        const actions = document.createElement("div");
        actions.className = "event-actions";

        const editButton = document.createElement("button");
        editButton.className = "event-button secondary-button edit-event";
        editButton.type = "button";
        editButton.setAttribute("data-event-id", event.id);
        editButton.textContent = "Edit";

        const deleteButton = document.createElement("button");
        deleteButton.className = "event-button danger-button delete-event";
        deleteButton.type = "button";
        deleteButton.setAttribute("data-event-id", event.id);
        deleteButton.textContent = "Delete";

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        details.appendChild(title);
        details.appendChild(dateInfo);
        details.appendChild(locationInfo);
        details.appendChild(description);
        details.appendChild(category);
        details.appendChild(actions);

        card.appendChild(imageWrap);
        card.appendChild(details);

        return card;
    }

    function renderEvents() {
        // Rebuild the full grid whenever the search text changes.
        const events = getFilteredEvents();
        eventsGrid.innerHTML = "";

        events.forEach(function (event) {
            eventsGrid.appendChild(createEventCard(event));
        });

        if (resultsCount) {
            resultsCount.textContent = events.length === 1 ? "1 event found" : events.length + " events found";
        }

        if (emptyState) {
            emptyState.classList.toggle("hidden-input", events.length > 0);
            if (events.length === 0) {
                emptyState.innerHTML = "<p>No events found. Add a new event to get started.</p>";
            }
        }
    }

    async function refreshAndRender() {
        // Fetch events again so the list stays up to date after delete.
        try {
            const response = await requestJson(API_URL, { method: "GET" });
            allEvents = response && Array.isArray(response.data) ? response.data : [];
            renderEvents();
        } catch (error) {
            eventsGrid.innerHTML = "";
            if (resultsCount) {
                resultsCount.textContent = "";
            }
            if (emptyState) {
                emptyState.classList.remove("hidden-input");
                emptyState.innerHTML = "<p>" + (error.message || "Could not load events.") + "</p>";
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderEvents);
    }

    // One listener handles both edit and delete buttons.
    eventsGrid.addEventListener("click", function (event) {
        const editButton = event.target.closest(".edit-event");
        const deleteButton = event.target.closest(".delete-event");

        if (editButton) {
            // Edit sends the user back to the add page in edit mode.
            const eventId = editButton.getAttribute("data-event-id");
            if (eventId) {
                window.location.href = "add-event.html?edit=" + encodeURIComponent(eventId);
            }
        }

        if (deleteButton) {
            // Ask first so accidental deletes are less likely.
            const eventId = deleteButton.getAttribute("data-event-id");
            if (!eventId) {
                return;
            }

            const confirmed = window.confirm("Delete this event?");
            if (!confirmed) {
                return;
            }

            requestJson(API_URL + "?id=" + encodeURIComponent(eventId), {
                method: "DELETE"
            }).then(function () {
                return refreshAndRender();
            }).catch(function (error) {
                window.alert(error.message || "Could not delete event.");
            });
        }
    });

    refreshAndRender();
})();
