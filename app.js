const express = require('express'); // Подключаем библиотеку

const PORT = 5000; // Константа, которая хранит порт приложения
const app = express(); // Создаём экземпляр приложения Express

app.use(express.json()); // Подключаем middleware для парсинга JSON-тела запросов
app.use(express.urlencoded({ extended: true })); // Подключаем middleware для парсинга URL-encoded данных (из форм)

// Подключение обработчиков
const roleRoutes = require('./routes/role-route');
const categoriesRoutes = require('./routes/category-route');
const userRoutes = require('./routes/user-route');
const productRoutes = require('./routes/product-route');
const cartRoutes = require('./routes/cart-route');
const orderRoutes = require('./routes/order-route');

app.use('/roles', roleRoutes);
app.use('/categories', categoriesRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/carts', cartRoutes);
app.use('/orders', orderRoutes);

app.listen(PORT, () => { // Запускаем сервер на указанном порту
    console.log(`Server running: http://localhost:${PORT}`); // Выводим сообщение в консоль после успешного запуска
});
