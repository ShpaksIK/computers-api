const express = require('express');
const { sql, getPool } = require('../database');

const router = express.Router();

// GET - получить все категории
router.get('/', async (req, res) => { // GET-маршрут для получения списка всех категорий
    try { // Блок для перехвата ошибок
        const pool = await getPool(); // Получаем соединение с БД из пула
        const result = await pool.request() // Создаем запрос
            .query('SELECT id, name FROM C_Category ORDER BY id'); // Выполняем SQL-запрос: выбираем ID и название, сортируем по ID
        
        res.json({ // Отправляем JSON-ответ
            success: true, // Флаг успешного выполнения
            data: result.recordset // Передаем полученные записи
        });
    } catch (err) { // Ловим ошибки
        console.error('Ошибка получения категорий:', err); // Логируем ошибку в консоль
        res.status(500).json({ // Отправляем ошибку сервера со статусом 500
            success: false,
            error: 'Серверная ошибка при получении категорий'
        });
    }
});

// POST - создать новую категорию
router.post('/', async (req, res) => { // POST-маршрут для создания категории
    const { name } = req.body; // Извлекаем название категории из тела запроса

    // Валидация обязательного поля
    if (!name) { // Проверяем, передано ли название
        return res.status(400).json({ // Если не передано - ошибка 400 (плохой запрос)
            success: false,
            error: 'Название категории обязательно для заполнения'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли категория с таким названием
        const existingCategory = await pool.request()
            .input('name', sql.VarChar, name) // Передаем параметр name с типом VarChar
            .query('SELECT id FROM C_Category WHERE name = @name'); // SQL-запрос на поиск по названию

        if (existingCategory.recordset.length > 0) { // Если категория уже существует
            return res.status(409).json({ // Отправляем ошибку конфликта (409)
                success: false,
                error: 'Категория с таким названием уже существует'
            });
        }

        // Создаем категорию
        const result = await pool.request()
            .input('name', sql.VarChar, name) // Передаем название
            .query(`INSERT INTO C_Category (name) VALUES (@name)`); // Выполняем вставку
        
        res.status(201).json({ // Отправляем ответ со статусом 201 (создано)
            success: true,
            message: 'Категория успешно создана'
        });
    } catch (err) { // Ловим ошибки
        console.error('Ошибка при создании категории:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при создании категории'
        });
    }
});

// PUT - обновить категорию
router.put('/:categoryId', async (req, res) => { // PUT-маршрут с параметром categoryId в URL
    const categoryId = req.params.categoryId; // Получаем ID категории из URL
    const { name } = req.body; // Получаем новое название из тела запроса

    // Валидация обязательного поля
    if (!name) { // Проверяем, передано ли название
        return res.status(400).json({ // Если нет - ошибка 400
            success: false,
            error: 'Название категории обязательно для заполнения'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли категория
        const existingCategory = await pool.request()
            .input('id', sql.Int, categoryId) // Передаем ID как параметр
            .query('SELECT id FROM C_Category WHERE id = @id'); // Ищем категорию по ID

        if (existingCategory.recordset.length === 0) { // Если категория не найдена
            return res.status(404).json({ // Ошибка 404 (не найдено)
                success: false,
                error: 'Категория не найдена'
            });
        }

        // Проверяем, не занято ли название другой категорией
        const nameCheck = await pool.request()
            .input('name', sql.NVarChar, name) // Передаем новое название
            .input('id', sql.Int, categoryId) // Передаем ID текущей категории
            .query('SELECT id FROM C_Category WHERE name = @name AND id != @id'); // Ищем категории с таким названием, кроме текущей

        if (nameCheck.recordset.length > 0) { // Если название уже занято
            return res.status(409).json({ // Ошибка конфликта
                success: false,
                error: 'Категория с таким названием уже существует'
            });
        }

        // Обновляем категорию
        await pool.request()
            .input('id', sql.Int, categoryId) // Передаем ID
            .input('name', sql.NVarChar, name) // Передаем новое название
            .query('UPDATE C_Category SET name = @name WHERE id = @id'); // Выполняем обновление

        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true,
            message: 'Категория успешно обновлена'
        });
        
    } catch (err) { // Ловим ошибки
        console.error('Ошибка при обновлении категории:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при обновлении категории'
        });
    }
});

// DELETE - жесткое удаление категории
router.delete('/:categoryId', async (req, res) => { // DELETE-маршрут с параметром categoryId
    const categoryId = req.params.categoryId; // Получаем ID категории из URL

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли категория
        const existingCategory = await pool.request()
            .input('id', sql.Int, categoryId) // Передаем ID
            .query('SELECT id, name FROM C_Category WHERE id = @id'); // Ищем категорию

        if (existingCategory.recordset.length === 0) { // Если не найдена
            return res.status(404).json({ // Ошибка 404
                success: false,
                error: 'Категория не найдена'
            });
        }

        // Проверяем, есть ли товары в этой категории
        const productsCheck = await pool.request()
            .input('id_category', sql.Int, categoryId) // Передаем ID категории
            .query('SELECT id FROM C_Product WHERE id_category = @id_category'); // Ищем товары с этой категорией

        if (productsCheck.recordset.length > 0) { // Если есть товары
            return res.status(409).json({ // Ошибка конфликта (409)
                success: false,
                error: 'Невозможно удалить категорию, так как в ней есть товары. Сначала удалите или переместите товары'
            });
        }

        // Жесткое удаление
        await pool.request()
            .input('id', sql.Int, categoryId) // Передаем ID
            .query('DELETE FROM C_Category WHERE id = @id'); // Выполняем удаление

        res.status(200).json({ // Отправляем успешный ответ
            success: true,
            message: 'Категория успешно удалена'
        });

    } catch (err) { // Ловим ошибки
        console.error('Ошибка при удалении категории:', err); // Логируем
        
        // Обработка ошибки внешнего ключа (на всякий случай)
        if (err.number === 547) { // Код 547 - нарушение FOREIGN KEY (MSSQL)
            return res.status(409).json({ // Ошибка конфликта
                success: false,
                error: 'Невозможно удалить категорию, так как она используется в товарах'
            });
        }
        
        res.status(500).json({ // Общая ошибка сервера
            success: false,
            error: 'Серверная ошибка при удалении категории'
        });
    }
});

module.exports = router;