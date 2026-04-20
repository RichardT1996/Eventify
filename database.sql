-- Create the project database if it does not already exist.
CREATE DATABASE IF NOT EXISTS eventify;
USE eventify;

-- Main table used by the REST API for event CRUD operations.
CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    image_path VARCHAR(255) NULL,
    PRIMARY KEY (id)
);
