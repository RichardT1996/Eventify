# Eventify

A full-stack event management web application built with PHP, MySQL, and vanilla JavaScript.

## Project Overview

Eventify allows users to create, view, search, edit, and delete events. Each event can have a name, date, time, location, category, description, and an image. All data is stored in a MySQL database.

## Prerequisites

Before you start, make sure you have the following installed on your machine:

- **PHP** (version 7.4 or higher) - [Download PHP](https://www.php.net/downloads)
- **MySQL** - [Download MySQL](https://dev.mysql.com/downloads/mysql/)
- A **code editor** like Visual Studio Code
- A **terminal** for running commands

### macOS users (using Homebrew)

```bash
brew install php mysql
```

## Installation & Setup

### 1. Clone or Download the Project

```bash
# Download or clone the project to your local machine
cd /path/to/Eventify
```

### 2. Set Up the MySQL Database

Start MySQL:

```bash
mysql -u root
```

Then, run the database setup script to create the database and table:

```bash
mysql -u root < database.sql
```

Or copy the SQL commands from `database.sql` and paste them into the MySQL terminal.

### 3. Start the PHP Server

From the project root directory, start the built-in PHP server:

```bash
php -S 127.0.0.1:8000
```

You should see output like:
```
Development Server started at http://127.0.0.1:8000
```

### 4. Open the App in Your Browser

Once the server is running, visit:

```
http://127.0.0.1:8000
```

## Project Structure

```
Eventify/
├── index.html              # Home page
├── add-event.html          # Add/Edit event form
├── view-events.html        # View and search events
├── about.html              # About page
├── styles.css              # All page styling
├── add-event.js            # Form logic
├── view-events.js          # Event list logic
├── database.sql            # Database schema
├── images/                 # Uploaded event images folder
├── api/
│   ├── events.php          # REST API (GET, POST, PUT, DELETE)
│   ├── db.php              # Database connection
│   └── config.php          # Database credentials
└── README.md               # This file
```

## Features

- **Create Events** - Add events with name, date, time, location, category, description, and image
- **View Events** - Browse all events in a card-based grid
- **Search Events** - Filter events by keyword (searches across name, location, category, description)
- **Edit Events** - Update event details and images
- **Delete Events** - Remove events with confirmation
- **Image Upload** - Upload JPG, PNG, GIF, or WEBP images (max 5MB)

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5
- **Backend**: PHP (REST API)
- **Database**: MySQL
- **Image Storage**: Local filesystem (`images/` folder)
- **Server**: PHP built-in dev server

## Database Configuration

The app connects to MySQL using credentials in `api/config.php`:

```php
'host' => '127.0.0.1',
'port' => '3306',
'database' => 'eventify',
'username' => 'root',
'password' => ''  // Blank by default (Homebrew MySQL)
```

If you set a password for your MySQL root user, update `api/config.php` accordingly.

## REST API Endpoints

- `GET /api/events.php` - Get all events
- `GET /api/events.php?id=1` - Get a single event
- `POST /api/events.php` - Create a new event (with FormData + image upload)
- `POST /api/events.php?id=1 (_method=PUT)` - Update an event
- `DELETE /api/events.php?id=1` - Delete an event


## Notes

- This is a local development project. For production, use a proper hosting service and secure your database.
- The `api/config.php` file is in `.gitignore` to keep credentials private. Don't commit it to version control.
- Uploaded images are stored in the `images/` folder on the server.

## License

Educational use only - Cardiff Metropolitan University DAT6006 assignment.
