const express = require('express'); // Подключаем Express для создания маршрутов
const { sql, getPool } = require('../database'); // Импортируем модуль для работы с БД: sql-объект и функцию получения пула соединений

const router = express.Router(); // Создаем экземпляр роутера Express для группировки маршрутов

router.get('/', async (req, res) => { // Определяем GET-маршрут по корневому пути с асинхронным обработчиком
    try { // Начало блока try для перехвата ошибок
        const pool = await getPool(); // Получаем пул соединений с БД
        const result = await pool.request().query('SELECT * FROM C_Role'); // Выполняем SQL-запрос на получение всех записей из таблицы C_Role
        
        res.status(200).json({ // Отправляем HTTP-ответ со статусом 200 (успех) и JSON-телом
            success: true, // Флаг успешного выполнения
            message: 'Данные успешно получены', // Сообщение об успехе
            data: result.recordset // Передаем полученные данные (массив записей)
        });
    } catch (err) { // Блок catch для обработки ошибок в try
        console.error('Ошибка запроса:', err); // Выводим подробную ошибку в консоль
        res.status(500).json({ // Отправляем ответ со статусом 500 (внутренняя ошибка)
            success: false, // Флаг неудачи
            error: 'Серверная ошибка' // Сообщение об ошибке
        })
    }
});

module.exports = router; // Экспортируем роутер для использования в других файлах