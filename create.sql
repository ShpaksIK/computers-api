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
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    patronymic VARCHAR(50),
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_role INT,
    CONSTRAINT fk_user_role FOREIGN KEY (id_role) REFERENCES Role (id)
);

CREATE TABLE Product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    id_category INT,
    price MONEY,
    quantity INT DEFAULT 0,
    description VARCHAR(255),
    manufacturer VARCHAR(50),
    CONSTRAINT fk_product_category FOREIGN KEY (id_category) REFERENCES Category (id)
);

CREATE TABLE "Order" (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT fk_order_user FOREIGN KEY (id_user) REFERENCES "User" (id)
);

CREATE TABLE Cart (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL,
    id_product INT NOT NULL,
    quantity INT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT fk_cart_user FOREIGN KEY (id_user) REFERENCES "User" (id),
    CONSTRAINT fk_cart_product FOREIGN KEY (id_product) REFERENCES Product (id)
);

CREATE TABLE OrderItem (
    id SERIAL PRIMARY KEY,
    id_order INT NOT NULL,
    id_product INT NOT NULL,
    quantity INT NOT NULL,
    price MONEY,
    CONSTRAINT fk_orderitem_order FOREIGN KEY (id_order) REFERENCES "Order" (id),
    CONSTRAINT fk_orderitem_product FOREIGN KEY (id_product) REFERENCES Product (id)
);