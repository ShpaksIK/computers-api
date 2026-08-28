const sql = require('mssql'); // Подключаем библиотеку для работы с MSSQL
require('dotenv').config(); // Загружаем переменные окружения из файла .env

const config = { // Объект конфигурации для подключения к БД
    user: process.env.DB_USER, // Имя пользователя из переменных окружения
    password: process.env.DB_PASSWORD, // Пароль из переменных окружения
    server: process.env.DB_SERVER, // Адрес сервера БД
    port: parseInt(process.env.DB_PORT), // Порт (преобразуем в число)
    database: process.env.DB_DATABASE, // Название базы данных
    options: { // Дополнительные настройки подключения
        encrypt: false, // Отключаем шифрование
        trustServerCertificate: true // Доверяем самоподписанному сертификату
    }
};

let pool = null; // Переменная для хранения пула соединений

async function getPool() { // Функция получения пула соединений
    try {
        if (pool) { // Если пул уже создан
            return pool; // Возвращаем существующий пул
        }
        pool = await sql.connect(config); // Создаём новое подключение и сохраняем в переменную
        console.log('Успешное подключение к MSSQL'); // Лог успеха
        return pool; // Возвращаем созданный пул
    } catch (err) { // Ловим ошибки
        console.error('Ошибка подключения к MSSQL:', err); // Лог ошибки
        throw err; // Пробрасываем ошибку дальше
    }
}

module.exports = { getPool, sql }; // Экспортируем функции и объекты для использования в других файлах