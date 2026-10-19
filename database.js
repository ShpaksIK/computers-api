const { Pool } = require('pg'); // Подключаем класс Pool из библиотеки pg для работы с PostgreSQL
require('dotenv').config(); // Загружаем переменные окружения из файла .env

// Объект конфигурации для подключения к PostgreSQL
const config = {
  user: process.env.DB_USER, // Имя пользователя
  password: process.env.DB_PASSWORD, // Пароль
  host: process.env.DB_SERVER, // Адрес сервера (в pg используется host вместо server)
  port: parseInt(process.env.DB_PORT) || 5432, // Порт (с дефолтным значением для Postgres)
  database: process.env.DB_DATABASE, // Название базы данных
  
  // Дополнительные настройки пула
  max: 10, // Максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // Время жизни простаивающего клиента (30 сек)
  connectionTimeoutMillis: 2000, // Таймаут подключения (2 сек)
  
  // Настройки SSL (аналог шифрования в mssql)
  // Если сервер требует SSL, раскомментируйте код ниже:
  /*
  ssl: {
    rejectUnauthorized: false // Доверяем самоподписанным сертификатам (аналог trustServerCertificate)
  }
  */
};

// Создаем экземпляр пула. В pg пул создается сразу и сам управляет подключениями
const pool = new Pool(config);

// Логируем успешное или ошибочное создание пула при первом запросе
pool.on('connect', () => {
  console.log('Успешное подключение к PostgreSQL и создание клиента в пуле');
});

pool.on('error', (err) => {
  console.error('Непредвиденная ошибка клиента в пуле PostgreSQL:', err);
});

// Функция для получения пула соединений (сохранена для совместимости с вашим старым кодом)
async function getPool() {
  return pool;
}

// Экспортируем функцию getPool и сам объект пула для выполнения прямых запросов (pool.query)
module.exports = { 
  getPool, 
  pool 
};
