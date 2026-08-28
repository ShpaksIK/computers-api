const express = require('express');
const { sql, getPool } = require('../database');

const router = express.Router();

// GET - получить все товары с информацией о категориях
router.get('/', async (req, res) => { // GET-маршрут для получения списка всех товаров
    try { // Блок для перехвата ошибок
        const pool = await getPool(); // Получаем соединение с БД из пула
        const result = await pool.request() // Создаем запрос
            .query(`
                SELECT p.id, p.id_category, c.name as category_name, p.name, 
                       p.description, p.price, p.quantity, p.manufacturer
                FROM C_Product p
                LEFT JOIN C_Category c ON p.id_category = c.id
                ORDER BY p.id
            `); // Выполняем SQL-запрос с JOIN для получения товаров и названий категорий
        
        res.json({ // Отправляем JSON-ответ
            success: true, // Флаг успешного выполнения
            data: result.recordset // Передаем полученные записи (массив товаров с категориями)
        });
    } catch (err) { // Ловим ошибки
        console.error('Ошибка получения товаров:', err); // Логируем ошибку в консоль
        res.status(500).json({ // Отправляем ошибку сервера со статусом 500
            success: false,
            error: 'Серверная ошибка при получении товаров'
        });
    }
});

// POST - создать новый товар
router.post('/', async (req, res) => { // POST-маршрут для создания товара
    const { id_category, name, description, price, quantity, manufacturer } = req.body; // Извлекаем поля из тела запроса

    // Валидация обязательных полей
    if (!id_category || !name || !price || !quantity || !description || !manufacturer) {
        return res.status(400).json({ // Если какое-то поле не передано - ошибка 400
            success: false,
            error: 'Заполните все поля'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли категория
        const categoryCheck = await pool.request()
            .input('id_category', sql.Int, id_category) // Передаем ID категории как параметр
            .query('SELECT id FROM C_Category WHERE id = @id_category'); // Ищем категорию по ID

        if (categoryCheck.recordset.length === 0) { // Если категория не найдена
            return res.status(404).json({ // Ошибка 404 (не найдено)
                success: false,
                error: 'Указанная категория не найдена'
            });
        }

        // Создаем товар
        await pool.request()
            .input('id_category', sql.Int, id_category) // Передаем ID категории
            .input('name', sql.VarChar, name) // Передаем название
            .input('description', sql.VarChar, description) // Передаем описание
            .input('price', sql.Money, price) // Передаем цену (тип Money)
            .input('quantity', sql.Int, quantity) // Передаем количество
            .input('manufacturer', sql.VarChar, manufacturer) // Передаем производителя
            .query(`
                INSERT INTO C_Product 
                (id_category, name, description, price, quantity, manufacturer) 
                VALUES 
                (@id_category, @name, @description, @price, @quantity, @manufacturer)
            `); // Выполняем INSERT-запрос
        
        res.status(201).json({ // Отправляем ответ со статусом 201 (создано)
            success: true,
            message: 'Товар успешно создан'
        });
    } catch (err) { // Ловим ошибки
        console.error('Ошибка при создании товара:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при создании товара'
        });
    }
});

// PUT - обновить товар (хотя бы один параметр)
router.put('/:productId', async (req, res) => { // PUT-маршрут с параметром productId в URL
    const productId = req.params.productId; // Получаем ID товара из URL
    const { id_category, name, description, price, quantity, manufacturer } = req.body; // Получаем поля из тела

    // Проверяем, что передан хотя бы один параметр для обновления
    if (id_category === undefined && !name && !description && 
        price === undefined && quantity === undefined && !manufacturer) {
        return res.status(400).json({ // Если ничего не передано - ошибка 400
            success: false,
            error: 'Необходимо передать хотя бы один параметр для обновления'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли товар
        const existingProduct = await pool.request()
            .input('id', sql.Int, productId) // Передаем ID товара
            .query('SELECT id FROM C_Product WHERE id = @id'); // Ищем товар по ID

        if (existingProduct.recordset.length === 0) { // Если товар не найден
            return res.status(404).json({ // Ошибка 404
                success: false,
                error: 'Товар не найден'
            });
        }

        // Если меняем категорию, проверяем её существование
        if (id_category !== undefined) {
            const categoryCheck = await pool.request()
                .input('id_category', sql.Int, id_category) // Передаем ID новой категории
                .query('SELECT id FROM C_Category WHERE id = @id_category'); // Проверяем существование

            if (categoryCheck.recordset.length === 0) { // Если категория не найдена
                return res.status(404).json({ // Ошибка 404
                    success: false,
                    error: 'Указанная категория не найдена'
                });
            }
        }

        // Динамически строим запрос
        const updates = []; // Массив для частей SET-выражения
        const request = pool.request(); // Создаем объект запроса
        
        if (id_category !== undefined) { // Если передан ID категории
            updates.push('id_category = @id_category');
            request.input('id_category', sql.Int, id_category); // Передаем значение
        }
        
        if (name) { // Если передано название
            updates.push('name = @name');
            request.input('name', sql.VarChar, name);
        }
        
        if (description !== undefined) { // Если передано описание (может быть пустой строкой)
            updates.push('description = @description');
            request.input('description', sql.VarChar, description);
        }
        
        if (price !== undefined) { // Если передана цена
            updates.push('price = @price');
            request.input('price', sql.Money, price);
        }
        
        if (quantity !== undefined) { // Если передано количество
            updates.push('quantity = @quantity');
            request.input('quantity', sql.Int, quantity);
        }
        
        if (manufacturer !== undefined) { // Если передан производитель
            updates.push('manufacturer = @manufacturer');
            request.input('manufacturer', sql.VarChar, manufacturer);
        }

        // Выполняем обновление
        request.input('id', sql.Int, productId); // Добавляем ID товара в запрос
        const query = `UPDATE C_Product SET ${updates.join(', ')} WHERE id = @id`; // Формируем SQL-запрос
        
        await request.query(query); // Выполняем обновление
        
        // Получаем обновленные данные товара
        const updatedProduct = await pool.request()
            .input('id', sql.Int, productId) // Передаем ID
            .query(`
                SELECT p.id, p.id_category, c.name as category_name, p.name, 
                       p.description, p.price, p.quantity, p.manufacturer
                FROM C_Product p
                LEFT JOIN C_Category c ON p.id_category = c.id
                WHERE p.id = @id
            `); // Запрос на получение свежих данных с JOIN для категории
        
        res.status(200).json({ // Отправляем успешный ответ со статусом 200
            success: true,
            message: 'Товар успешно обновлен',
            data: updatedProduct.recordset[0] // Возвращаем обновленный товар
        });
        
    } catch (err) { // Ловим ошибки
        console.error('Ошибка при обновлении товара:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при обновлении товара'
        });
    }
});

// DELETE - удалить товар (жесткое удаление)
router.delete('/:productId', async (req, res) => { // DELETE-маршрут с параметром productId
    const productId = req.params.productId; // Получаем ID товара из URL

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли товар
        const existingProduct = await pool.request()
            .input('id', sql.Int, productId) // Передаем ID
            .query('SELECT id, name FROM C_Product WHERE id = @id'); // Ищем товар по ID

        if (existingProduct.recordset.length === 0) { // Если товар не найден
            return res.status(404).json({ // Ошибка 404
                success: false,
                error: 'Товар не найден'
            });
        }

        // Жесткое удаление
        await pool.request()
            .input('id', sql.Int, productId) // Передаем ID
            .query('DELETE FROM C_Product WHERE id = @id'); // Выполняем удаление

        res.status(200).json({ // Отправляем успешный ответ
            success: true,
            message: 'Товар успешно удален'
        });

    } catch (err) { // Ловим ошибки
        console.error('Ошибка при удалении товара:', err); // Логируем
        
        // Обработка ошибки внешнего ключа (если товар используется в заказах)
        if (err.number === 547) { // Код 547 - нарушение FOREIGN KEY в MSSQL
            return res.status(409).json({ // Ошибка конфликта (409)
                success: false,
                error: 'Невозможно удалить товар, так как он используется в заказах или других связанных таблицах'
            });
        }
        
        res.status(500).json({ // Общая ошибка сервера
            success: false,
            error: 'Серверная ошибка при удалении товара'
        });
    }
});
module.exports = router;