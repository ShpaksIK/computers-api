CREATE TABLE Role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE Category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    patronymic VARCHAR(50) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_role INT NOT NULL,
    CONSTRAINT fk_user_role FOREIGN KEY (id_role) REFERENCES Role (id)
);

CREATE TABLE Product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    id_category INT NOT NULL,
    price MONEY NOT NULL,
    quantity INT DEFAULT 0 NOT NULL,
    description VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(50) NOT NULL,
    CONSTRAINT fk_product_category FOREIGN KEY (id_category) REFERENCES Category (id)
);

CREATE TABLE "Order" (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT fk_order_user FOREIGN KEY (id_user) REFERENCES "User" (id)
);

CREATE TABLE Cart (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL,
    id_product INT NOT NULL,
    quantity INT NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT fk_cart_user FOREIGN KEY (id_user) REFERENCES "User" (id),
    CONSTRAINT fk_cart_product FOREIGN KEY (id_product) REFERENCES Product (id)
);

CREATE TABLE OrderItem (
    id SERIAL PRIMARY KEY,
    id_order INT NOT NULL,
    id_product INT NOT NULL,
    quantity INT NOT NULL,
    price MONEY NOT NULL,
    CONSTRAINT fk_orderitem_order FOREIGN KEY (id_order) REFERENCES "Order" (id),
    CONSTRAINT fk_orderitem_product FOREIGN KEY (id_product) REFERENCES Product (id)
);

INSERT INTO Role (name) VALUES
('Пользователь'),
('Менеджер'),
('Администратор');