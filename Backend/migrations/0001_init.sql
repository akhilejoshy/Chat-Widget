-- +migrate Up

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_pic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE website_scripts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon TEXT,
    website_id VARCHAR(255) UNIQUE NOT NULL,
    script TEXT NOT NULL
);

CREATE TABLE chat_bot_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE SEQUENCE chat_id_seq START 1;

CREATE TABLE chat_bot_chats (
    id SERIAL PRIMARY KEY,
    chat_id TEXT DEFAULT ('CHAT-' || LPAD(nextval('chat_id_seq')::TEXT, 3, '0')),
    client_id INTEGER NOT NULL,
    client_name VARCHAR(255),
    website_id VARCHAR(255),
    department VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'open', 'closed')),
    description TEXT,
    ip_address TEXT,
    country VARCHAR(255),
    browser VARCHAR(255),
    device VARCHAR(255),
    jointed_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatbot_client
        FOREIGN KEY (client_id) REFERENCES chat_bot_clients(id) ON DELETE CASCADE,

    CONSTRAINT fk_chatbot_website
        FOREIGN KEY (website_id) REFERENCES website_scripts(website_id) ON DELETE SET NULL,

    CONSTRAINT fk_chatbot_jointed_by
        FOREIGN KEY (jointed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    messager VARCHAR(50) NOT NULL CHECK (messager IN ('client', 'employee')),
    message_by VARCHAR(255),
    message_type VARCHAR(50) NOT NULL
        CHECK (message_type IN ('public message', 'public log', 'private message', 'private log')),
    user_id INTEGER,
    client_id INTEGER,
    messaged_as INTEGER,
    chat_id INTEGER NOT NULL,
    message TEXT,
    current_page TEXT,
    file_path TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_message_chat
        FOREIGN KEY (chat_id) REFERENCES chat_bot_chats(id) ON DELETE CASCADE,

    CONSTRAINT fk_message_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT fk_message_client
        FOREIGN KEY (client_id) REFERENCES chat_bot_clients(id) ON DELETE SET NULL,

    CONSTRAINT fk_message_messaged_as
        FOREIGN KEY (messaged_as) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE auto_responses (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL
);

-- +migrate Down

DROP TABLE IF EXISTS auto_responses;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_bot_chats;
DROP SEQUENCE IF EXISTS chat_id_seq;
DROP TABLE IF EXISTS chat_bot_clients;
DROP TABLE IF EXISTS website_scripts;
DROP TABLE IF EXISTS users;
