const express = require('express');
const { getPool } = require('../database');

const router = express.Router();

// GET-запрос на получение всех пользователей
router.get('/', async (req, res) => { // Определяем GET маршрут по корневому пути (с асинхронным обработчиком)
    try { // Начало блока try для обработки ошибок
        const pool = await getPool(); // Получаем пул соединений с БД (асинхронно)
        const result = await pool.query('SELECT * FROM "User"'); // Выполняем SQL-запрос на выборку всех пользователей
        
        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true, // Флаг успешного выполнения
            message: 'Данные успешно получены', // Сообщение
            data: result.rows // Передаем полученный массив пользователей
        });
    } catch (err) { // Блок перехвата ошибок
        console.error('Ошибка запроса:', err); // Логируем ошибку в консоль
        res.status(500).json({ // Отправляем ответ с ошибкой сервера (статус 500)
            success: false,
            error: 'Серверная ошибка'
        })
    }
});

// POST-запрос на создание нового пользователя
router.post('/', async (req, res) => { // Определяем POST маршрут
    const { firstName, lastName, patronymic, login, password, roleId } = req.body; // Деструктурируем поля из тела запроса

    try { // Начало блока try
        const pool = await getPool(); // Получаем пул соединений

        // Проверяем, существует ли пользователь с таким логином
        const existingUser = await pool.query(
            'SELECT id FROM "User" WHERE login = $1',
            [login] // Передаем параметр login
        );

        if (existingUser.rows.length > 0) { // Если найден пользователь
            return res.status(409).json({ // Отправляем ошибку конфликта (статус 409)
                success: false,
                error: 'Такой логин уже занят'
            });
        }

        // Вставляем нового пользователя
        const result = await pool.query(
            `INSERT INTO "User" 
                (first_name, last_name, patronymic, login, password, id_role) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
            [firstName, lastName, patronymic, login, password, roleId] // Передаем значения
        );
        
        res.status(201).json({ // Отправляем успешный ответ со статусом 201 (создано)
            success: true,
            message: 'Пользователь создан успешно'
        });
    } catch (err) { // Обработка ошибок
        console.error('Ошибка запроса:', err); // Логируем ошибку
        res.status(500).json({ // Отправляем ошибку сервера
            success: false,
            error: 'Серверная ошибка'
        });
    }
});

// PUT-запрос на обновление пользователя
router.put('/:userId', async (req, res) => { // Определяем PUT маршрут с параметром userId в URL
    const userId = req.params.userId; // Получаем ID пользователя из URL
    const { firstName, lastName, patronymic, login, password, roleId } = req.body; // Получаем обновляемые поля из тела

    // Проверяем, что передан хотя бы один параметр для обновления
    if (!firstName && !lastName && !patronymic && !login && !password && !roleId) {
        return res.status(400).json({ // Если ничего не передано - ошибка 400 (плохой запрос)
            success: false,
            error: 'Необходимо передать хотя бы один параметр для обновления'
        });
    }

    try { // Начало блока try
        const pool = await getPool(); // Получаем пул соединений

        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            'SELECT id FROM "User" WHERE id = $1',
            [userId] // Передаем ID как параметр
        );

        if (existingUser.rows.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Отправляем ошибку 404 (не найдено)
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Если меняем логин, проверяем его уникальность
        if (login) {
            const loginCheck = await pool.query(
                'SELECT id FROM "User" WHERE login = $1 AND id != $2',
                [login, userId] // Передаем новый логин и ID текущего пользователя
            );

            if (loginCheck.rows.length > 0) { // Если логин уже занят другим пользователем
                return res.status(409).json({ // Ошибка конфликта
                    success: false,
                    error: 'Такой логин уже занят другим пользователем'
                });
            }
        }

        // Динамически строим запрос на обновление
        const updates = []; // Массив для частей SET-выражения
        const values = []; // Массив значений
        let paramIndex = 1; // Индекс параметра
        
        if (firstName) { // Если передано имя
            updates.push(`first_name = $${paramIndex++}`); // Добавляем обновление поля
            values.push(firstName); // Передаем значение
        }
        
        if (lastName) { // Если передана фамилия
            updates.push(`last_name = $${paramIndex++}`);
            values.push(lastName);
        }
        
        if (patronymic) { // Если передано отчество
            updates.push(`patronymic = $${paramIndex++}`);
            values.push(patronymic);
        }
        
        if (login) { // Если передан логин
            updates.push(`login = $${paramIndex++}`);
            values.push(login);
        }
        
        if (password) { // Если передан пароль
            updates.push(`password = $${paramIndex++}`);
            values.push(password);
        }
        
        if (roleId) { // Если передан ID роли
            updates.push(`id_role = $${paramIndex++}`);
            values.push(roleId);
        }

        // Добавляем ID пользователя в конец массива значений
        values.push(userId);

        // Выполняем обновление
        const query = `UPDATE "User" SET ${updates.join(', ')} WHERE id = $${paramIndex}`; // Формируем итоговый SQL-запрос
        
        await pool.query(query, values); // Выполняем обновление
        
        // Получаем обновленные данные пользователя
        const updatedUser = await pool.query(
            'SELECT id, first_name AS firstName, last_name AS lastName, patronymic, login, id_role FROM "User" WHERE id = $1',
            [userId] // Передаем ID
        );

        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true,
            message: 'Пользователь успешно обновлен',
            data: updatedUser.rows[0] // Возвращаем обновленного пользователя
        });
        
    } catch (err) { // Обработка ошибок
        console.error('Ошибка при обновлении пользователя:', err); // Логируем ошибку
        res.status(500).json({ // Отправляем ошибку сервера
            success: false,
            error: 'Серверная ошибка при обновлении пользователя'
        });
    }
});

// DELETE-запрос на удаление пользователя
router.delete('/:userId', async (req, res) => { // Определяем DELETE маршрут с параметром userId
    const userId = req.params.userId; // Получаем ID пользователя из URL

    try { // Начало блока try
        const pool = await getPool(); // Получаем пул соединений

        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            'SELECT id, first_name, last_name, login FROM "User" WHERE id = $1',
            [userId] // Передаем ID
        );

        if (existingUser.rows.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Отправляем ошибку 404
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Выполняем удаление
        await pool.query(
            'DELETE FROM "User" WHERE id = $1',
            [userId] // Передаем ID
        );

        res.status(200).json({ // Отправляем успешный ответ
            success: true,
            message: 'Пользователь успешно удален'
        });

    } catch (err) { // Обработка ошибок
        console.error('Ошибка при удалении пользователя:', err); // Логируем ошибку
        
        // Обработка ошибки внешнего ключа (если у пользователя есть связанные данные)
        if (err.code === '23503') { // Код 23503 - нарушение FOREIGN KEY constraint в PostgreSQL
            return res.status(409).json({ // Отправляем ошибку конфликта (409)
                success: false,
                error: 'Невозможно удалить пользователя, так как существуют связанные с ним данные'
            });
        }
        
        res.status(500).json({ // Общая ошибка сервера
            success: false,
            error: 'Серверная ошибка при удалении пользователя'
        });
    }
});

module.exports = router;
