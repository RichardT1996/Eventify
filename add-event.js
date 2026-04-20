(function () {
    const form = document.getElementById("event-form");
    if (!form) {
        return;
    }

    const API_URL = "api/events.php";

    // These elements are used by the form and its helper messages.
    const formTitle = document.getElementById("form-title");
    const saveButton = document.getElementById("save-button");
    const clearButton = document.getElementById("clear-button");
    const formMessage = document.getElementById("form-message");

    const nameInput = document.getElementById("event-name");
    const dateInput = document.getElementById("event-date");
    const timeInput = document.getElementById("event-time");
    const locationInput = document.getElementById("location");
    const categoryInput = document.getElementById("category");
    const descriptionInput = document.getElementById("description");

    const imageInput = document.getElementById("event-image");
    const browseButton = document.getElementById("browse-image");
    const selectedFileName = document.getElementById("selected-file-name");
    const imagePreview = document.getElementById("image-preview");

    const params = new URLSearchParams(window.location.search);
    const editingId = params.get("edit");

    let currentImagePath = "";
    let selectedImageFile = null;

    // Reused message area for both success and error feedback.
    function setMessage(message, isError) {
        formMessage.textContent = message;
        formMessage.classList.toggle("error", Boolean(isError));
        formMessage.classList.toggle("success", !isError);
    }

    async function requestJson(url, options) {
        // Keep the fetch setup in one place so the form code stays small.
        const fetchOptions = {
            ...options
        };

        const body = fetchOptions && fetchOptions.body;
        if (!(body instanceof FormData)) {
            fetchOptions.headers = {
                "Content-Type": "application/json",
                ...(fetchOptions.headers || {})
            };
        }

        const response = await fetch(url, fetchOptions);

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

    function showImagePreview(imageSource) {
        // Hide the preview when there is no image to show.
        if (!imageSource) {
            imagePreview.classList.add("hidden-input");
            imagePreview.src = "";
            return;
        }

        imagePreview.src = imageSource;
        imagePreview.classList.remove("hidden-input");
    }

    function setFormFromEvent(event) {
        // Fill the form when editing an existing event.
        nameInput.value = event.name || "";
        dateInput.value = event.date || "";
        timeInput.value = event.time || "";
        locationInput.value = event.location || "";
        categoryInput.value = event.category || "";
        descriptionInput.value = event.description || "";

        currentImagePath = event.image_path || "";
        selectedImageFile = null;
        selectedFileName.textContent = currentImagePath ? "Current image saved" : "No image selected";
        showImagePreview(currentImagePath);
    }

    // If URL has ?edit=ID we load that event and switch form into edit mode.
    async function loadEditState() {
        if (!editingId) {
            return;
        }

        try {
            const response = await requestJson(API_URL + "?id=" + encodeURIComponent(editingId), {
                method: "GET"
            });

            if (!response || !response.data) {
                setMessage("Event not found. Add a new event instead.", true);
                return;
            }

            formTitle.textContent = "Edit Event";
            saveButton.textContent = "Update Event";
            setFormFromEvent(response.data);
        } catch (error) {
            setMessage(error.message || "Could not load event.", true);
        }
    }

    function buildFormData() {
        // FormData is used so images and text can be sent together.
        const formData = new FormData();
        formData.append("name", nameInput.value.trim());
        formData.append("date", dateInput.value);
        formData.append("time", timeInput.value);
        formData.append("location", locationInput.value.trim());
        formData.append("category", categoryInput.value);
        formData.append("description", descriptionInput.value.trim());

        if (selectedImageFile) {
            formData.append("image", selectedImageFile);
        }

        return formData;
    }

    browseButton.addEventListener("click", function () {
        // Trigger the hidden file input with a custom button.
        imageInput.click();
    });

    imageInput.addEventListener("change", function (event) {
        // Save the selected file and show a quick preview.
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        selectedImageFile = file;
        selectedFileName.textContent = file.name;
        showImagePreview(URL.createObjectURL(file));
    });

    clearButton.addEventListener("click", function () {
        // Reset image state when the user clears the form.
        currentImagePath = "";
        selectedImageFile = null;
        selectedFileName.textContent = "No image selected";
        showImagePreview("");
        setMessage("", false);
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Simple front-end validation before sending the API request.
        const payload = {
            name: nameInput.value.trim(),
            date: dateInput.value,
            time: timeInput.value,
            location: locationInput.value.trim(),
            category: categoryInput.value,
            description: descriptionInput.value.trim()
        };

        if (!payload.name || !payload.date || !payload.time || !payload.location || !payload.category || !payload.description) {
            setMessage("Please complete all required fields.", true);
            return;
        }

        try {
            // PUT is sent as POST + _method because we are using FormData.
            if (editingId) {
                const updateData = buildFormData();
                updateData.append("_method", "PUT");

                const updateResponse = await requestJson(API_URL + "?id=" + encodeURIComponent(editingId), {
                    method: "POST",
                    body: updateData
                });

                if (updateResponse && updateResponse.data && updateResponse.data.image_path) {
                    currentImagePath = updateResponse.data.image_path;
                    selectedImageFile = null;
                    selectedFileName.textContent = "Current image saved";
                    showImagePreview(currentImagePath);
                }

                setMessage("Event updated successfully.", false);
                return;
            }

            await requestJson(API_URL, {
                method: "POST",
                body: buildFormData()
            });

            // Reset the form after a successful create.
            form.reset();
            currentImagePath = "";
            selectedImageFile = null;
            selectedFileName.textContent = "No image selected";
            showImagePreview("");
            setMessage("Event added successfully.", false);
        } catch (error) {
            setMessage(error.message || "Unable to save event.", true);
        }
    });

    loadEditState();
})();
