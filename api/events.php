<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
// The API only allows the methods used by this project.
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests from the browser.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Send one JSON response and stop the request.
function respond(int $statusCode, array $data): void
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Read JSON bodies when the request does not use FormData.
function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || $rawBody === '') {
        return [];
    }

    $payload = json_decode($rawBody, true);
    return is_array($payload) ? $payload : [];
}

function resolveHttpMethod(): string
{
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    // Allow POST + _method override for FormData updates/deletes.
    if ($method === 'POST' && isset($_POST['_method'])) {
        $override = strtoupper(trim((string)$_POST['_method']));
        if ($override === 'PUT' || $override === 'DELETE') {
            return $override;
        }
    }

    return $method;
}

function readRequestPayload(string $method): array
{
    // FormData populates $_POST, so use that first for create/update requests.
    if (($method === 'POST' || $method === 'PUT') && !empty($_POST)) {
        return $_POST;
    }

    return readJsonBody();
}

function saveUploadedImage(?array $file): ?string
{
    // No file selected, so keep the event without an image.
    if ($file === null || !isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    // Any upload error should return a clear message to the frontend.
    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond(422, ['error' => 'Image upload failed.']);
    }

    // Keep uploads small so the project stays light and fast.
    $maxBytes = 5 * 1024 * 1024;
    if (($file['size'] ?? 0) > $maxBytes) {
        respond(422, ['error' => 'Image exceeds 5MB limit.']);
    }

    // Check the actual file type instead of trusting the extension.
    $tmpName = (string)($file['tmp_name'] ?? '');
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = $finfo ? (string)finfo_file($finfo, $tmpName) : '';
    if ($finfo) {
        finfo_close($finfo);
    }

    $allowedMimeTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp'
    ];

    // Only allow common image formats that the browser can display easily.
    if (!isset($allowedMimeTypes[$mimeType])) {
        respond(422, ['error' => 'Only JPG, PNG, GIF, and WEBP images are allowed.']);
    }

    // Store images in the project folder so the app works locally.
    $imagesDir = dirname(__DIR__) . '/images';
    if (!is_dir($imagesDir) && !mkdir($imagesDir, 0755, true) && !is_dir($imagesDir)) {
        respond(500, ['error' => 'Could not create images directory.']);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $allowedMimeTypes[$mimeType];
    $destination = $imagesDir . '/' . $filename;

    if (!move_uploaded_file($tmpName, $destination)) {
        respond(500, ['error' => 'Could not store uploaded image.']);
    }

    // Save a relative path so it works across local environments.
    return 'images/' . $filename;
}

function deleteStoredImage(?string $relativePath): void
{
    // Ignore empty values so delete/update can still work without images.
    if (!$relativePath) {
        return;
    }

    $normalized = ltrim($relativePath, '/\\');
    if (strpos($normalized, 'images/') !== 0) {
        return;
    }

    $absolutePath = dirname(__DIR__) . '/' . $normalized;
    if (is_file($absolutePath)) {
        @unlink($absolutePath);
    }
}

function validatedEventPayload(array $payload): array
{
    // These are the fields the form must always send.
    $requiredFields = ['name', 'date', 'time', 'location', 'category', 'description'];

    foreach ($requiredFields as $field) {
        $value = trim((string)($payload[$field] ?? ''));
        if ($value === '') {
            respond(422, ['error' => sprintf('Field "%s" is required.', $field)]);
        }
    }

    return [
        'name' => trim((string)$payload['name']),
        'date' => trim((string)$payload['date']),
        'time' => trim((string)$payload['time']),
        'location' => trim((string)$payload['location']),
        'category' => trim((string)$payload['category']),
        'description' => trim((string)$payload['description']),
    ];
}

$method = resolveHttpMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Return one event when an id is provided.
        if ($id !== null && $id > 0) {
            $statement = $db->prepare('SELECT id, name, date, time, location, category, description, image_path FROM events WHERE id = :id');
            $statement->execute(['id' => $id]);
            $event = $statement->fetch();

            if (!$event) {
                respond(404, ['error' => 'Event not found.']);
            }

            respond(200, ['data' => $event]);
        }

        // Return all events for the listing page.
        $statement = $db->query('SELECT id, name, date, time, location, category, description, image_path FROM events ORDER BY date ASC, time ASC, id ASC');
        $events = $statement->fetchAll();
        respond(200, ['data' => $events]);
    }

    if ($method === 'POST') {
        // Create a brand new event.
        $payload = validatedEventPayload(readRequestPayload($method));
        $imagePath = saveUploadedImage($_FILES['image'] ?? null) ?? null;

        $statement = $db->prepare(
            'INSERT INTO events (name, date, time, location, category, description, image_path)
             VALUES (:name, :date, :time, :location, :category, :description, :image_path)'
        );
        $statement->execute([...$payload, 'image_path' => $imagePath]);

        respond(201, ['data' => ['id' => (int)$db->lastInsertId(), 'image_path' => $imagePath]]);
    }

    if ($method === 'PUT') {
        // Make sure the event id exists before trying to update it.
        if ($id === null || $id <= 0) {
            respond(400, ['error' => 'Valid event id is required.']);
        }

        $existingStatement = $db->prepare('SELECT image_path FROM events WHERE id = :id');
        $existingStatement->execute(['id' => $id]);
        $existingEvent = $existingStatement->fetch();
        if (!$existingEvent) {
            respond(404, ['error' => 'Event not found.']);
        }

        $payload = validatedEventPayload(readRequestPayload($method));
        $newImagePath = saveUploadedImage($_FILES['image'] ?? null);
        $imagePath = $newImagePath ?? (string)($existingEvent['image_path'] ?? '');

        $statement = $db->prepare(
            'UPDATE events
             SET name = :name,
                 date = :date,
                 time = :time,
                 location = :location,
                 category = :category,
                 description = :description,
                 image_path = :image_path
             WHERE id = :id'
        );

        $statement->execute([...$payload, 'image_path' => $imagePath, 'id' => $id]);

        // Remove old image only after a successful update with a new upload.
        if ($newImagePath !== null && !empty($existingEvent['image_path']) && $existingEvent['image_path'] !== $newImagePath) {
            deleteStoredImage((string)$existingEvent['image_path']);
        }

        respond(200, ['data' => ['id' => $id, 'image_path' => $imagePath]]);
    }

    if ($method === 'DELETE') {
        // Delete also needs a valid event id.
        if ($id === null || $id <= 0) {
            respond(400, ['error' => 'Valid event id is required.']);
        }

        $imageStatement = $db->prepare('SELECT image_path FROM events WHERE id = :id');
        $imageStatement->execute(['id' => $id]);
        $existingEvent = $imageStatement->fetch();
        if (!$existingEvent) {
            respond(404, ['error' => 'Event not found.']);
        }

        $statement = $db->prepare('DELETE FROM events WHERE id = :id');
        $statement->execute(['id' => $id]);

        // Keep storage tidy by deleting the linked image file too.
        deleteStoredImage((string)($existingEvent['image_path'] ?? ''));

        respond(200, ['data' => ['id' => $id]]);
    }

    respond(405, ['error' => 'Method not allowed.']);
} catch (PDOException $exception) {
    respond(500, ['error' => 'Database error: ' . $exception->getMessage()]);
} catch (Throwable $exception) {
    respond(500, ['error' => 'Server error: ' . $exception->getMessage()]);
}
