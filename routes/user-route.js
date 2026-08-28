const express = require('express');
const { sql, getPool } = require('../database');

const router = express.Router();

// GET-запрос на получение всех пользователей
router.get('/', async (req, res) => { // Определяем GET маршрут по корневому пути (с асинхронным обработчиком)
    try { // Начало блока try для обработки ошибок
        const pool = await getPool(); // Получаем пул соединений с БД (асинхронно)
        const result = await pool.request().query('SELECT * FROM C_User'); // Выполняем SQL-запрос на выборку всех пользователей
        
        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true, // Флаг успешного выполнения
            message: 'Данные успешно получены', // Сообщение
            data: result.recordset // Передаем полученный массив пользователей
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
        const existingUser = await pool.request()
            .input('login', sql.VarChar, login) // Передаем параметр login с типом VarChar
            .query('SELECT id FROM C_User WHERE login = @login'); // SQL-запрос с параметром

        if (existingUser.recordset.length > 0) { // Если найден пользователь
            return res.status(409).json({ // Отправляем ошибку конфликта (статус 409)
                success: false,
                error: 'Такой логин уже занят'
            });
        }

        // Вставляем нового пользователя
        const result = await pool.request()
            .input('first_name', sql.VarChar, firstName) // Передаем имя
            .input('last_name', sql.VarChar, lastName) // Передаем фамилию
            .input('patronymic', sql.VarChar, patronymic) // Передаем отчество
            .input('login', sql.VarChar, login) // Передаем логин
            .input('password', sql.VarChar, password) // Передаем пароль (в реальности нужно хэшировать!)
            .input('id_role', sql.Int, roleId) // Передаем ID роли
            .query(`INSERT INTO C_User 
                (first_name, last_name, patronymic, login, password, id_role) 
                VALUES (@first_name, @last_name, @patronymic, @login, @password, @id_role);`); // SQL-запрос на вставку
        
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
        const existingUser = await pool.request()
            .input('id', sql.Int, userId) // Передаем ID как параметр
            .query('SELECT id FROM C_User WHERE id = @id'); // Запрос на проверку существования

        if (existingUser.recordset.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Отправляем ошибку 404 (не найдено)
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Если меняем логин, проверяем его уникальность
        if (login) {
            const loginCheck = await pool.request()
                .input('login', sql.VarChar, login) // Передаем новый логин
                .input('id', sql.Int, userId) // Передаем ID текущего пользователя
                .query('SELECT id FROM C_User WHERE login = @login AND id != @id'); // Проверяем, нет ли такого логина у других пользователей

            if (loginCheck.recordset.length > 0) { // Если логин уже занят другим пользователем
                return res.status(409).json({ // Ошибка конфликта
                    success: false,
                    error: 'Такой логин уже занят другим пользователем'
                });
            }
        }

        // Динамически строим запрос на обновление
        const updates = []; // Массив для частей SET-выражения
        const request = pool.request(); // Создаем объект запроса
        
        if (firstName) { // Если передано имя
            updates.push('first_name = @first_name'); // Добавляем обновление поля
            request.input('first_name', sql.VarChar, firstName); // Передаем значение
        }
        
        if (lastName) { // Если передана фамилия
            updates.push('last_name = @last_name');
            request.input('last_name', sql.VarChar, lastName);
        }
        
        if (patronymic) { // Если передано отчество
            updates.push('patronymic = @patronymic');
            request.input('patronymic', sql.VarChar, patronymic);
        }
        
        if (login) { // Если передан логин
            updates.push('login = @login');
            request.input('login', sql.VarChar, login);
        }
        
        if (password) { // Если передан пароль
            updates.push('password = @password');
            request.input('password', sql.VarChar, password);
        }
        
        if (roleId) { // Если передан ID роли
            updates.push('id_role = @id_role');
            request.input('id_role', sql.Int, roleId);
        }

        // Выполняем обновление
        request.input('id', sql.Int, userId); // Добавляем ID пользователя в запрос
        const query = `UPDATE C_User SET ${updates.join(', ')} WHERE id = @id`; // Формируем итоговый SQL-запрос
        
        await request.query(query); // Выполняем обновление
        
        // Получаем обновленные данные пользователя
        const updatedUser = await pool.request()
            .input('id', sql.Int, userId) // Передаем ID
            .query('SELECT id, first_name, last_name, patronymic, login, id_role FROM C_User WHERE id = @id'); // Запрос на получение свежих данных
        
        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true,
            message: 'Пользователь успешно обновлен',
            data: updatedUser.recordset[0] // Возвращаем обновленного пользователя
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
        const existingUser = await pool.request()
            .input('id', sql.Int, userId) // Передаем ID
            .query('SELECT id, first_name, last_name, login FROM C_User WHERE id = @id'); // Запрос на получение данных пользователя

        if (existingUser.recordset.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Отправляем ошибку 404
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Выполняем удаление
        await pool.request()
            .input('id', sql.Int, userId) // Передаем ID
            .query('DELETE FROM C_User WHERE id = @id'); // Выполняем удаление

        res.status(200).json({ // Отправляем успешный ответ
            success: true,
            message: 'Пользователь успешно удален'
        });

    } catch (err) { // Обработка ошибок
        console.error('Ошибка при удалении пользователя:', err); // Логируем ошибку
        
        // Обработка ошибки внешнего ключа (если у пользователя есть связанные данные)
        if (err.number === 547) { // Код 547 - нарушение FOREIGN KEY constraint в MSSQL
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
