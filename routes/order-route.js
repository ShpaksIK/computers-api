const express = require('express');
const { sql, getPool } = require('../database');

const router = express.Router();

// GET - получить все заказы пользователя
router.get('/user/:userId', async (req, res) => { // GET-маршрут с параметром userId в URL
    const userId = req.params.userId; // Получаем ID пользователя из URL

    try { // Блок для перехвата ошибок
        const pool = await getPool(); // Получаем соединение с БД из пула

        // Проверяем, существует ли пользователь
        const userCheck = await pool.request()
            .input('id', sql.Int, userId) // Передаем ID пользователя как параметр
            .query('SELECT id FROM C_User WHERE id = @id'); // Ищем пользователя по ID

        if (userCheck.recordset.length === 0) { // Если пользователь не найден
            return res.status(404).json({ // Отправляем ошибку 404 (не найдено)
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Получаем все заказы пользователя
        const orders = await pool.request()
            .input('id_user', sql.Int, userId) // Передаем ID пользователя
            .query(`
                SELECT 
                    o.id,
                    o.date,
                    COUNT(DISTINCT oi.id) as items_count,
                    SUM(oi.price * oi.quantity) as total_amount,
                    STRING_AGG(p.name, ', ') as product_names
                FROM C_Order o
                LEFT JOIN C_OrderItem oi ON o.id = oi.id_order
                LEFT JOIN C_Product p ON oi.id_product = p.id
                WHERE o.id_user = @id_user
                GROUP BY o.id, o.date
                ORDER BY o.date DESC
            `);

        res.json({ // Отправляем JSON-ответ
            success: true, // Флаг успешного выполнения
            data: orders.recordset.map(order => ({ // Преобразуем полученные данные
                id: order.id, // ID заказа
                date: order.date, // Дата заказа
                items_count: order.items_count || 0, // Количество товаров (0 если нет товаров)
                total_amount: order.total_amount || 0, // Общая сумма (0 если нет товаров)
                product_names: order.product_names || '' // Названия товаров (пустая строка если нет)
            }))
        });

    } catch (err) { // Ловим ошибки
        console.error('Ошибка получения заказов пользователя:', err); // Логируем ошибку в консоль
        res.status(500).json({ // Отправляем ошибку сервера со статусом 500
            success: false,
            error: 'Серверная ошибка при получении заказов'
        });
    }
});

module.exports = router;