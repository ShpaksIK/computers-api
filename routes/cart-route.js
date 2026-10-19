const express = require('express');
const { getPool } = require('../database');

const router = express.Router();

// GET - получить содержимое корзины пользователя
router.get('/:userId', async (req, res) => { // GET-маршрут с параметром userId в URL
    const userId = req.params.userId; // Получаем ID пользователя из URL

    try { // Блок для перехвата ошибок
        const pool = await getPool(); // Получаем соединение с БД из пула

        const result = await pool.query(`
            SELECT 
                c.id,
                c.id_product,
                c.quantity,
                c.date,
                p.name as product_name,
                p.price,
                p.manufacturer,
                (p.price * c.quantity) as subtotal
            FROM Cart c
            JOIN Product p ON c.id_product = p.id
            WHERE c.id_user = $1
            ORDER BY c.date DESC
        `, [userId]); // Выполняем SQL-запрос с JOIN для получения товаров в корзине

        // Считаем общую сумму корзины
        let totalAmount = 0; // Инициализируем переменную для общей суммы
        for (const item of result.rows) { // Проходим по всем товарам в корзине
            totalAmount += parseInt(item.subtotal); // Добавляем сумму каждого товара
        }

        res.json({ // Отправляем JSON-ответ
            success: true, // Флаг успешного выполнения
            message: 'Данные успешно получены', // Сообщение об успехе
            data: { // Объект с данными
                items: result.rows, // Массив товаров в корзине
                totalItems: result.rows.length, // Общее количество позиций
                totalAmount: totalAmount // Общая сумма корзины
            }
        });

    } catch (err) { // Ловим ошибки
        console.error('Ошибка получения корзины:', err); // Логируем ошибку в консоль
        res.status(500).json({ // Отправляем ошибку сервера со статусом 500
            success: false,
            error: 'Серверная ошибка при получении корзины'
        });
    }
});

// POST - добавить товар в корзину
router.post('/', async (req, res) => { // POST-маршрут для добавления товара
    const { id_user, id_product, quantity } = req.body; // Извлекаем поля из тела запроса

    // Валидация обязательных полей
    if (!id_user || !id_product || !quantity) { // Проверяем наличие всех полей
        return res.status(400).json({ // Если поля отсутствуют - ошибка 400
            success: false,
            error: 'Обязательные поля: id_user, id_product, quantity'
        });
    }

    if (quantity <= 0) { // Проверяем, что количество больше 0
        return res.status(400).json({ // Если меньше или равно 0 - ошибка
            success: false,
            error: 'Количество товара должно быть больше 0'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли пользователь
        const userCheck = await pool.query(
            'SELECT id FROM "User" WHERE id = $1',
            [id_user] // Передаем ID пользователя
        );

        if (userCheck.rows.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Ошибка 404 (не найдено)
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Проверяем, существует ли товар
        const productCheck = await pool.query(
            'SELECT id, name, price, quantity as stock_quantity FROM Product WHERE id = $1',
            [id_product] // Передаем ID товара
        );

        if (productCheck.rows.length === 0) { // Если товар не найден
            return res.status(404).json({ // Ошибка 404
                success: false,
                error: 'Товар не найден'
            });
        }

        const product = productCheck.rows[0]; // Получаем данные товара

        // Проверяем, достаточно ли товара на складе
        if (product.stock_quantity < quantity) { // Если на складе меньше запрашиваемого количества
            return res.status(400).json({ // Ошибка 400 (некорректный запрос)
                success: false,
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity}`
            });
        }

        // Проверяем, есть ли уже этот товар в корзине пользователя
        const existingCartItem = await pool.query(
            'SELECT id, quantity FROM Cart WHERE id_user = $1 AND id_product = $2',
            [id_user, id_product] // Передаем ID пользователя и ID товара
        );

        if (existingCartItem.rows.length > 0) { // Если товар уже есть в корзине
            // Обновляем количество, если товар уже есть в корзине
            const newQuantity = existingCartItem.rows[0].quantity + quantity; // Суммируем количество
            
            await pool.query(
                'UPDATE Cart SET quantity = $1 WHERE id = $2',
                [newQuantity, existingCartItem.rows[0].id] // Передаем новое количество и ID записи
            );

            res.status(200).json({ // Отправляем успешный ответ со статусом 200
                success: true,
                message: 'Количество товара в корзине обновлено'
            });
        } else { // Если товара нет в корзине
            // Добавляем новый товар в корзину
            const result = await pool.query(
                `INSERT INTO Cart (id_user, id_product, quantity, date) 
                 VALUES ($1, $2, $3, $4)`,
                [id_user, id_product, quantity, new Date()] // Передаем значения
            );

            res.status(201).json({ // Отправляем ответ со статусом 201 (создано)
                success: true,
                message: 'Товар добавлен в корзину'
            });
        }
    } catch (err) { // Ловим ошибки
        console.error('Ошибка при добавлении товара в корзину:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при добавлении товара в корзину'
        });
    }
});

// DELETE - удалить товар из корзины
router.delete('/', async (req, res) => { // DELETE-маршрут для удаления товара из корзины
    const { id_user, id_product } = req.body; // Извлекаем ID пользователя и товара из тела

    // Валидация обязательных полей
    if (!id_user || !id_product) { // Проверяем наличие обоих полей
        return res.status(400).json({ // Если отсутствуют - ошибка 400
            success: false,
            error: 'Обязательные поля: id_user, id_product'
        });
    }

    try { // Блок try
        const pool = await getPool(); // Получаем соединение с БД

        // Проверяем, существует ли товар в корзине пользователя
        const cartItem = await pool.query(
            `SELECT c.id
             FROM Cart c
             WHERE c.id_user = $1 AND c.id_product = $2`,
            [id_user, id_product] // Передаем ID пользователя и ID товара
        );

        if (cartItem.rows.length === 0) { // Если товар не найден в корзине
            return res.status(404).json({ // Ошибка 404
                success: false,
                error: 'Товар не найден в корзине пользователя'
            });
        }

        // Удаляем товар из корзины
        await pool.query(
            'DELETE FROM Cart WHERE id = $1',
            [cartItem.rows[0].id] // Передаем ID записи в корзине
        );

        res.status(200).json({ // Отправляем успешный ответ
            success: true,
            message: 'Товар удален из корзины'
        });

    } catch (err) { // Ловим ошибки
        console.error('Ошибка при удалении товара из корзины:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при удалении товара из корзины'
        });
    }
});

// DELETE - купить всю корзину (удалить все товары из корзины пользователя)
router.delete('/buy', async (req, res) => { // DELETE-маршрут для оформления покупки
    const { id_user } = req.body; // Извлекаем ID пользователя из тела

    // Валидация обязательного поля
    if (!id_user) { // Проверяем наличие ID пользователя
        return res.status(400).json({ // Если отсутствует - ошибка 400
            success: false,
            error: 'Обязательное поле: id_user'
        });
    }

    const client = await (await getPool()).connect(); // Получаем клиента из пула для транзакции

    try { // Блок try
        // Получаем все товары в корзине пользователя
        const cartItems = await client.query(
            `SELECT c.id_product, c.quantity, p.name, p.price, p.quantity as stock_quantity
             FROM Cart c
             JOIN Product p ON c.id_product = p.id
             WHERE c.id_user = $1`,
            [id_user] // Передаем ID пользователя
        );

        if (cartItems.rows.length === 0) { // Если корзина пуста
            return res.status(400).json({ // Ошибка 400
                success: false,
                error: 'Корзина пользователя пуста'
            });
        }

        // Проверяем наличие всех товаров на складе и считаем общую сумму
        let totalAmount = 0; // Инициализируем общую сумму
        let insufficientStock = []; // Массив для товаров с недостаточным количеством

        for (const item of cartItems.rows) { // Проходим по всем товарам в корзине
            if (item.stock_quantity < item.quantity) { // Если на складе меньше запрашиваемого
                insufficientStock.push({ // Добавляем в список недостающих
                    id_product: item.id_product,
                    name: item.name,
                    available: item.stock_quantity,
                    requested: item.quantity
                });
            }
            totalAmount += item.price * item.quantity; // Считаем общую сумму
        }

        if (insufficientStock.length > 0) { // Если есть товары с недостаточным количеством
            return res.status(400).json({ // Ошибка 400 с деталями
                success: false,
                error: 'Некоторые товары отсутствуют в нужном количестве',
                insufficientStock: insufficientStock // Передаем список недостающих товаров
            });
        }

        // Начинаем транзакцию
        await client.query('BEGIN'); // Начинаем транзакцию

        try { // Внутренний блок try для транзакции
            // 1. Создаем заказ
            const orderResult = await client.query(
                `INSERT INTO "Order" (id_user, date) 
                 VALUES ($1, $2)
                 RETURNING id`,
                [id_user, new Date()] // Передаем ID пользователя и текущую дату
            );

            const orderId = orderResult.rows[0].id; // Получаем ID созданного заказа

            // 2. Добавляем товары в OrderItem и уменьшаем количество на складе
            const orderItems = []; // Массив для деталей заказа
            
            for (const item of cartItems.rows) { // Проходим по всем товарам в корзине
                // Добавляем товар в заказ
                await client.query(
                    `INSERT INTO OrderItem (id_product, id_order, price, quantity) 
                     VALUES ($1, $2, $3, $4)`,
                    [item.id_product, orderId, item.price, item.quantity] // Передаем значения
                );

                // Уменьшаем количество товара на складе
                await client.query(
                    `UPDATE Product 
                     SET quantity = quantity - $1 
                     WHERE id = $2`,
                    [item.quantity, item.id_product] // Передаем количество для списания и ID товара
                );

                orderItems.push({ // Добавляем информацию о товаре в массив
                    id_product: item.id_product,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity
                });
            }

            // 3. Очищаем корзину пользователя
            await client.query(
                'DELETE FROM Cart WHERE id_user = $1',
                [id_user] // Передаем ID пользователя
            );

            await client.query('COMMIT'); // Фиксируем транзакцию (сохраняем все изменения)

            res.status(200).json({ // Отправляем успешный ответ
                success: true,
                message: 'Заказ успешно оформлен',
                data: { // Возвращаем данные о созданном заказе
                    id: orderId, // ID заказа
                    id_user: id_user, // ID пользователя
                    date: new Date(), // Дата заказа
                    totalAmount: totalAmount, // Общая сумма
                    items: orderItems // Список товаров в заказе
                }
            });

        } catch (err) { // Если произошла ошибка в транзакции
            await client.query('ROLLBACK'); // Откатываем транзакцию (отменяем все изменения)
            throw err; // Пробрасываем ошибку дальше
        }

    } catch (err) { // Ловим ошибки
        console.error('Ошибка при покупке корзины:', err); // Логируем
        res.status(500).json({ // Ошибка сервера
            success: false,
            error: 'Серверная ошибка при оформлении покупки'
        });
    } finally {
        client.release(); // Возвращаем клиента в пул
    }
});

module.exports = router;